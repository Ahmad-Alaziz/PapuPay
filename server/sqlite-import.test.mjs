import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { importVenueSqlite } from "../scripts/import-venue-sqlite.mjs";
import { digest, openLoyalty } from "./loyalty.mjs";
import { pgTest, testDatabase } from "./postgres-test.mjs";
import { createWalletRecovery } from "./wallet-recovery.mjs";

pgTest("import preserves existing sessions, ledger order and signed Wallet recovery", async (t) => {
  const database = await testDatabase(t, ["sweeto", "other"]);
  const dir = await mkdtemp(join(tmpdir(), "papupay-import-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, "venue.sqlite");
  const expiry = Date.now() + 60_000;
  const type = "pass.test.papupay";
  const firstTime = "2026-01-03T00:00:00.000Z";
  const laterInLedger = "2026-01-02T00:00:00.000Z";
  const reference = "ref".padEnd(32, "x");
  const checkout = "pp_preserved_checkout";
  const original = new DatabaseSync(file);
  try {
    original.exec(`
      CREATE TABLE papupay_venue(singleton INTEGER, venue_id TEXT);
      INSERT INTO papupay_venue VALUES (1, 'sweeto');
      CREATE TABLE memberships(id, code, checkout, created_at);
      CREATE TABLE guest_sessions(token_hash, card_id, expires_at);
      CREATE TABLE staff_sessions(token_hash, role, expires_at);
      CREATE TABLE ledger(id, action_id, card_id, kind, receipt, reverses, reason, actor, actor_role, created_at);
      CREATE TABLE receipt_claims(receipt, event_id);
      CREATE TABLE review_clicks(day, clicks);
      CREATE TABLE wallet_revision(singleton, revision);
      INSERT INTO wallet_revision VALUES (1, 21);
      CREATE TABLE wallet_passes(pass_type, serial, card_id, auth_token, revision, updated_at, issued_revision, recovery_version);
      CREATE TABLE wallet_devices(pass_type, device_hash, push_token, registration);
      CREATE TABLE wallet_registrations(pass_type, device_hash, serial);
      CREATE TABLE wallet_notifications(pass_type, device_hash, revision, due_at, attempts, lease_id, leased_until);
      CREATE TABLE wallet_recovery(card_id, reference, expires_at, version);
    `);
    original.prepare("INSERT INTO memberships VALUES ('card', 'ABCD2345', ?, ?)").run(checkout, firstTime);
    original.prepare("INSERT INTO guest_sessions VALUES (?, 'card', ?)").run(digest("guest"), expiry);
    original.prepare("INSERT INTO staff_sessions VALUES (?, 'manager', ?)").run(digest("staff"), expiry);
    original.prepare(`INSERT INTO ledger (rowid, id, action_id, card_id, kind, receipt, actor, actor_role, created_at)
      VALUES (7, 'stamp-one', 'action-one', 'card', 'stamp', 'R1', 'cashier', 'staff', ?),
             (12, 'stamp-two', 'action-two', 'card', 'stamp', 'R2', 'cashier', 'staff', ?)`).run(firstTime, laterInLedger);
    original.exec("INSERT INTO receipt_claims VALUES ('R1', 'stamp-one'), ('R2', 'stamp-two')");
    original.exec("INSERT INTO review_clicks VALUES ('2026-01-02', 3)");
    original.prepare("INSERT INTO wallet_passes VALUES (?, 'serial', 'card', 'auth-token', 21, ?, 19, 3)").run(type, laterInLedger);
    original.prepare("INSERT INTO wallet_devices VALUES (?, ?, 'push-token', 2)").run(type, digest("device"));
    original.prepare("INSERT INTO wallet_registrations VALUES (?, ?, 'serial')").run(type, digest("device"));
    original.prepare("INSERT INTO wallet_notifications VALUES (?, ?, 21, 1000, 3, 'prior-worker', 99999)").run(type, digest("device"));
    original.prepare("INSERT INTO wallet_recovery VALUES ('card', ?, ?, 3)").run(reference, expiry);
  } finally {
    original.close();
  }

  await assert.rejects(importVenueSqlite(database, "other", file), /requested venue/);
  const counts = await importVenueSqlite(database, "sweeto", file);
  assert.equal(counts.ledger, 2);
  await assert.rejects(importVenueSqlite(database, "sweeto", file), /already has a SQLite import/);
  const store = openLoyalty(database.venue("sweeto"));
  const active = await store.guest("guest");
  assert.equal(active.checkout, checkout);
  assert.equal(active.stamps, 2);
  assert.equal(active.updatedAt, laterInLedger);
  assert.equal((await store.staff("staff")).role, "manager");
  assert.deepEqual((await store.lookup(checkout)).events.map(({ id }) => id), ["stamp-two", "stamp-one"]);
  assert.equal((await store.wallet.pass(type, "serial")).auth_token, "auth-token");
  assert.equal(await store.wallet.claim(type, 999, 90_000), null);
  const claim = await store.wallet.claim(type, 1000, 90_000);
  assert.equal(claim.attempts, 3);
  assert.equal(Number(claim.revision), 21);

  const secret = "local-import-test-secret-of-sufficient-length";
  const legacySignature = createHmac("sha256", secret)
    .update(JSON.stringify(["wallet-recovery", "sweeto", "card", reference, 3, expiry])).digest("base64url");
  const recovery = createWalletRecovery({
    env: { PAPUPAY_RECOVERY_SECRET: secret }, brand: { id: "sweeto" },
    store: store.wallet, rateLimit: store.rateLimit,
  });
  const check = await recovery.validate(`${reference}.3.${legacySignature}`, "fixture");
  assert.equal(check.entry?.card_id, "card");

  await store.updateCard({ code: checkout, actionId: "action-three", kind: "stamp", receipt: "R3", actor: { id: "cashier", role: "staff" } });
  const { rows } = await database.venue("sweeto").query("SELECT sequence FROM ledger WHERE action_id = 'action-three'");
  assert.equal(rows[0].sequence, "13");
  assert.equal((await store.guest("guest")).stamps, 3);
  assert.equal(Number((await store.wallet.pass(type, "serial")).revision), 22);
});
