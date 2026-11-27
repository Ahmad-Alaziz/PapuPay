import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLoyalty } from "./loyalty.mjs";
import { pgTest, testDatabase } from "./postgres-test.mjs";

pgTest("the same action ID racing across memberships has one winner", async (t) => {
  const database = await testDatabase(t);
  const store = openLoyalty(database.venue("sweeto"));
  const expiresAt = Date.now() + 60_000;
  const cards = await Promise.all(["first-session", "second-session"].map(token => store.createGuest(token, expiresAt)));
  const actionId = randomUUID();
  const results = await Promise.allSettled(cards.map((card, index) => store.updateCard({
    code: card.checkout,
    actionId,
    kind: "stamp",
    receipt: `receipt-${index}`,
    actor: { id: "staff", role: "staff" },
  })));
  const failure = results.find(result => result.status === "rejected");
  assert.equal(failure?.reason.status, 409);
  assert.equal(failure.reason.message, "action_conflict");
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  const balances = await Promise.all(cards.map(async card => (await store.lookup(card.checkout)).card.stamps));
  assert.deepEqual(balances.sort(), [0, 1]);
});

pgTest("staff and recovery attempt limits survive a store restart and stay isolated by venue", async (t) => {
  const database = await testDatabase(t, ["sweeto", "second-venue"]);
  const first = openLoyalty(database.venue("sweeto"));
  const second = openLoyalty(database.venue("sweeto"));
  const otherVenue = openLoyalty(database.venue("second-venue"));
  const limits = { limit: 3, windowMs: 2000, now: 1000 };

  const failed = await Promise.all([first, second, first, second, first].map(store =>
    store.rateLimit("staff", "same-client", false, limits)));
  assert.equal(failed.filter(Boolean).length, 3);
  assert.equal(await second.rateLimit("staff", "same-client", true, limits), false);
  assert.equal(await second.rateLimit("recovery", "same-client", true, limits), true);
  assert.equal(await otherVenue.rateLimit("staff", "same-client", true, limits), true);
  assert.equal(await first.rateLimit("staff", "same-client", true, { ...limits, now: 3000 }), true);
});
