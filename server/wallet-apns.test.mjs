import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { openLoyalty } from "./loyalty.mjs";
import { classifyAPNsResponse, createApnsSender, drainWalletNotifications } from "./wallet-apns.mjs";

test("Wallet push uses certificate-authenticated production APNs and the Pass Type ID", async (t) => {
  const topic = "pass.test.papupay";
  const token = "ab".repeat(32);
  let lastRequest;
  const socket = new EventEmitter();
  socket.setTimeout = () => {};
  socket.destroy = () => socket.emit("close");
  socket.request = (headers) => {
    const stream = new EventEmitter();
    stream.setTimeout = () => {};
    stream.setEncoding = () => {};
    stream.end = (body) => {
      lastRequest = { headers, body };
      queueMicrotask(() => { stream.emit("response", { ":status": 200 }); stream.emit("end"); });
    };
    return stream;
  };
  const credentials = { certificate: "leaf PEM fixture", wwdr: "chain PEM fixture", key: "private key fixture" };
  const push = createApnsSender(async () => credentials, (origin, tls) => {
    assert.equal(origin, "https://api.push.apple.com");
    assert.equal(tls.key, credentials.key);
    assert.equal(tls.cert, `${credentials.certificate}\n${credentials.wwdr}`);
    return socket;
  });
  t.after(push.close);
  assert.deepEqual(await push.send(token, topic), { outcome: "sent" });
  assert.equal(lastRequest.headers[":path"], `/3/device/${token}`);
  assert.equal(lastRequest.headers[":method"], "POST");
  assert.equal(lastRequest.headers["apns-topic"], topic);
  assert.equal(lastRequest.body, "{}");
  assert.deepEqual(classifyAPNsResponse(429, { "retry-after": "60" }, "{}"), { outcome: "retry", status: 429, afterMs: 60_000 });
  assert.deepEqual(classifyAPNsResponse(410, {}, '{"reason":"Unregistered"}'), { outcome: "unregistered" });
});

test("durable outbox coalesces updates, retries after backoff, and does not lose a newer revision", async (t) => {
  const loyalty = openLoyalty(":memory:", "sweeto");
  t.after(loyalty.close);
  const type = "pass.test.papupay";
  const serial = "fixture-serial";
  const card = loyalty.createGuest("fixture-token", Date.now() + 10_000);
  const state = loyalty.wallet;
  state.issue(type, serial, card.checkout);
  state.register(type, serial, "fixture-device", "ab".repeat(32));
  const stamp = () => loyalty.updateCard({ code: card.checkout, actionId: randomUUID(), kind: "stamp", actor: { id: "fixture", role: "test" } });
  stamp();
  stamp();

  let now = 1000;
  let sends = 0;
  const cycle = (outcome, afterMs = 0) => drainWalletNotifications({
    store: state, passType: type, clock: () => now, random: () => 0,
    send: async () => { sends += 1; return { outcome, afterMs }; },
  });
  await cycle("retry", 10_000);
  await cycle("sent");
  assert.equal(sends, 1);
  now += 10_000;
  await cycle("sent");
  await cycle("sent");
  assert.equal(sends, 2);

  stamp();
  const inFlight = state.claim(type, now, 90_000);
  stamp();
  state.settle(inFlight, "sent", 0);
  const next = state.claim(type, now, 90_000);
  assert(next.revision > inFlight.revision);
  state.settle(next, "sent", 0);
  assert.equal(state.claim(type, now, 90_000), null);

  stamp();
  const obsoleteToken = state.claim(type, now, 90_000);
  state.register(type, serial, "fixture-device", "fe".repeat(32));
  state.settle(obsoleteToken, "unregistered", 0);
  const refreshedToken = state.claim(type, now, 90_000);
  assert.equal(refreshedToken.push_token, "fe".repeat(32));
  state.settle(refreshedToken, "unregistered", 0);
  assert.deepEqual(state.updated(type, "fixture-device", 0), []);
});

test("a queued pass notification and its retry deadline survive reopening the database", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "papupay-wallet-outbox-"));
  const file = join(directory, "ledger.sqlite");
  const type = "pass.test.papupay";
  const startedAt = 1000;
  const retryAt = startedAt + 5000;
  let ledger = openLoyalty(file, "sweeto");
  t.after(async () => { ledger?.close(); await rm(directory, { recursive: true, force: true }); });

  const card = ledger.createGuest("wallet-persistence-fixture", Date.now() + 10_000);
  ledger.wallet.issue(type, "fixture-serial", card.checkout);
  ledger.wallet.register(type, "fixture-serial", "fixture-device", "ab".repeat(32));
  ledger.updateCard({ code: card.checkout, actionId: randomUUID(), kind: "stamp", actor: { id: "fixture", role: "test" } });
  const pending = ledger.wallet.claim(type, startedAt, 90_000);
  ledger.wallet.settle(pending, "retry", retryAt);
  ledger.close();
  ledger = null;

  ledger = openLoyalty(file, "sweeto");
  assert.equal(ledger.wallet.claim(type, retryAt - 1, 90_000), null);
  const retry = ledger.wallet.claim(type, retryAt, 90_000);
  assert.equal(retry.revision, pending.revision);
  assert.equal(retry.attempts, 1);
  ledger.wallet.settle(retry, "sent", 0);
  assert.equal(ledger.wallet.claim(type, retryAt, 90_000), null);
});

test("late registration catches up and an obsolete APNs response cannot remove a new registration", (t) => {
  const ledger = openLoyalty(":memory:", "sweeto");
  t.after(ledger.close);
  const type = "pass.test.papupay";
  const serial = "fixture-serial";
  const device = "fixture-device";
  const token = "ab".repeat(32);
  const card = ledger.createGuest("fixture-token", Date.now() + 10_000);
  const state = ledger.wallet;
  state.issue(type, serial, card.checkout);
  ledger.updateCard({ code: card.checkout, actionId: randomUUID(), kind: "stamp", actor: { id: "fixture", role: "test" } });
  assert.equal(state.claim(type, 1000, 90_000), null);

  state.register(type, serial, device, token);
  const obsolete = state.claim(type, 1000, 90_000);
  assert.equal(obsolete.push_token, token);
  state.unregister(type, serial, device);
  state.register(type, serial, device, token);
  const latest = state.claim(type, 1000, 90_000);
  assert.equal(latest.registration, obsolete.registration);
  assert.notEqual(latest.lease_id, obsolete.lease_id);

  state.settle(obsolete, "unregistered", 0);
  assert.deepEqual(state.updated(type, device, 0).map(({ serial }) => serial), [serial]);
  state.settle(latest, "unregistered", 0);
  assert.deepEqual(state.updated(type, device, 0), []);
});
