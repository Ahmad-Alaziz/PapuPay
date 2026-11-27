import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { pgTest, testDatabase } from "./postgres-test.mjs";
import { createDatabase } from "./postgres.mjs";
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

pgTest("durable outbox coalesces updates, retries after backoff, and does not lose a newer revision", async (t) => {
  const db = await testDatabase(t);
  const loyalty = openLoyalty(db.venue("sweeto"));
  const type = "pass.test.papupay";
  const serial = "fixture-serial";
  const card = await loyalty.createGuest("fixture-token", Date.now() + 10_000);
  const state = loyalty.wallet;
  await state.issue(type, serial, card.checkout);
  await state.register(type, serial, "fixture-device", "ab".repeat(32));
  const stamp = () => loyalty.updateCard({ code: card.checkout, actionId: randomUUID(), kind: "stamp", actor: { id: "fixture", role: "test" } });
  await stamp();
  await stamp();

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

  await stamp();
  const inFlight = await state.claim(type, now, 90_000);
  await stamp();
  await state.settle(inFlight, "sent", 0);
  const next = await state.claim(type, now, 90_000);
  assert(BigInt(next.revision) > BigInt(inFlight.revision));
  await state.settle(next, "sent", 0);
  assert.equal(await state.claim(type, now, 90_000), null);

  await stamp();
  const obsoleteToken = await state.claim(type, now, 90_000);
  await state.register(type, serial, "fixture-device", "fe".repeat(32));
  await state.settle(obsoleteToken, "unregistered", 0);
  const refreshedToken = await state.claim(type, now, 90_000);
  assert.equal(refreshedToken.push_token, "fe".repeat(32));
  await state.settle(refreshedToken, "unregistered", 0);
  assert.deepEqual(await state.updated(type, "fixture-device", 0), []);
});

pgTest("a queued pass notification and its retry deadline survive reopening the database", async (t) => {
  const db = await testDatabase(t);
  const type = "pass.test.papupay";
  const startedAt = 1000;
  const retryAt = startedAt + 5000;
  const ledger = openLoyalty(db.venue("sweeto"));

  const card = await ledger.createGuest("wallet-persistence-fixture", Date.now() + 10_000);
  await ledger.wallet.issue(type, "fixture-serial", card.checkout);
  await ledger.wallet.register(type, "fixture-serial", "fixture-device", "ab".repeat(32));
  await ledger.updateCard({ code: card.checkout, actionId: randomUUID(), kind: "stamp", actor: { id: "fixture", role: "test" } });
  const pending = await ledger.wallet.claim(type, startedAt, 90_000);
  await ledger.wallet.settle(pending, "retry", retryAt);

  const reopened = createDatabase(process.env.PAPUPAY_TEST_DATABASE_URL, { namespace: db.schema("sweeto").slice(0, -21) });
  t.after(reopened.close);
  const worker = openLoyalty(reopened.venue("sweeto")).wallet;
  assert.equal(await worker.claim(type, retryAt - 1, 90_000), null);
  const retry = await worker.claim(type, retryAt, 90_000);
  assert.equal(retry.revision, pending.revision);
  assert.equal(retry.attempts, 1);
  await worker.settle(retry, "sent", 0);
  assert.equal(await worker.claim(type, retryAt, 90_000), null);
});

pgTest("late registration catches up and an obsolete APNs response cannot remove a new registration", async (t) => {
  const db = await testDatabase(t);
  const ledger = openLoyalty(db.venue("sweeto"));
  const type = "pass.test.papupay";
  const serial = "fixture-serial";
  const device = "fixture-device";
  const token = "ab".repeat(32);
  const card = await ledger.createGuest("fixture-token", Date.now() + 10_000);
  const state = ledger.wallet;
  await state.issue(type, serial, card.checkout);
  await ledger.updateCard({ code: card.checkout, actionId: randomUUID(), kind: "stamp", actor: { id: "fixture", role: "test" } });
  assert.equal(await state.claim(type, 1000, 90_000), null);

  await state.register(type, serial, device, token);
  const obsolete = await state.claim(type, 1000, 90_000);
  assert.equal(obsolete.push_token, token);
  await state.unregister(type, serial, device);
  await state.register(type, serial, device, token);
  const latest = await state.claim(type, 1000, 90_000);
  assert.equal(latest.registration, obsolete.registration);
  assert.notEqual(latest.lease_id, obsolete.lease_id);

  await state.settle(obsolete, "unregistered", 0);
  assert.deepEqual((await state.updated(type, device, 0)).map(({ serial }) => serial), [serial]);
  await state.settle(latest, "unregistered", 0);
  assert.deepEqual(await state.updated(type, device, 0), []);
});


pgTest("parallel workers lease each pending Wallet device once", async (t) => {
  const database = await testDatabase(t);
  const loyalty = openLoyalty(database.venue("sweeto"));
  const type = "pass.test.papupay";
  const card = await loyalty.createGuest("wallet-worker-fixture", Date.now() + 10_000);
  await loyalty.wallet.issue(type, "fixture-serial", card.checkout);
  const tokens = ["ab".repeat(32), "cd".repeat(32)];
  await Promise.all(tokens.map((token, index) => loyalty.wallet.register(type, "fixture-serial", `device-${index}`, token)));
  await loyalty.updateCard({
    code: card.checkout, actionId: randomUUID(), kind: "stamp", actor: { id: "fixture", role: "test" },
  });

  const jobs = await Promise.all(Array.from({ length: 4 }, () => loyalty.wallet.claim(type, 1000, 90_000)));
  assert.deepEqual(jobs.filter(Boolean).map(({ push_token }) => push_token).sort(), tokens);
  await Promise.all(jobs.filter(Boolean).map((job) => loyalty.wallet.settle(job, "sent", 0)));
  assert.equal(await loyalty.wallet.claim(type, 1000, 90_000), null);
});

pgTest("a newly registered older pass is eligible after a device's newer update cursor", async (t) => {
  const database = await testDatabase(t);
  const loyalty = openLoyalty(database.venue("sweeto"));
  const type = "pass.test.papupay";
  const device = "shared-wallet-device";
  const token = "ab".repeat(32);
  const stamp = (card) => loyalty.updateCard({
    code: card.checkout, actionId: randomUUID(), kind: "stamp", actor: { id: "fixture", role: "test" },
  });

  const early = await loyalty.createGuest("early-pass-fixture", Date.now() + 10_000);
  await loyalty.wallet.issue(type, "early-serial", early.checkout);
  await stamp(early);
  const newer = await loyalty.createGuest("newer-pass-fixture", Date.now() + 10_000);
  await loyalty.wallet.issue(type, "newer-serial", newer.checkout);
  await loyalty.wallet.register(type, "newer-serial", device, token);
  await stamp(newer);
  const seen = await loyalty.wallet.updated(type, device, 0);
  assert.deepEqual(seen.map(({ serial }) => serial), ["newer-serial"]);

  await loyalty.wallet.register(type, "early-serial", device, token);
  const unseen = await loyalty.wallet.updated(type, device, seen[0].revision);
  assert.deepEqual(unseen.map(({ serial }) => serial), ["early-serial"]);
});
