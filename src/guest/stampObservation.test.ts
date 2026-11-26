import { beforeEach, expect, it, vi } from "vitest";
import type { LoyaltyCard } from "./api";
import { observeStampBalance } from "./stampObservation";

const shown = () => true;
const storage = new Map<string, string>();
let venue: string;
let scope = 0;
function card(
  stamps: number,
  visits = stamps,
  sequence = visits,
  checkout = "counter-secret",
): LoyaltyCard {
  return {
    checkout,
    code: "MANUAL123",
    goal: 6,
    stamps,
    visits,
    rewardAvailable: stamps === 6,
    updatedAt: new Date(1_800_000_000_000 + sequence * 1000).toISOString(),
  };
}
beforeEach(() => {
  storage.clear();
  venue = "/api/v/fixture-" + ++scope;
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
  });
});

it("observes 2 → 3 on return, 3 → 4 live, and each duplicate quietly", async () => {
  expect(await observeStampBalance(venue, card(2), shown)).toEqual({
    kind: "quiet",
  });
  // A fresh module has none of the previous page's in-memory state.
  vi.resetModules();
  const fresh = (await import("./stampObservation")).observeStampBalance;
  expect(await fresh(venue, card(3), shown)).toEqual({
    kind: "earned",
    count: 1,
  });
  expect(await fresh(venue, card(3), shown)).toEqual({ kind: "quiet" });
  expect(await fresh(venue, card(4), shown)).toEqual({
    kind: "earned",
    count: 1,
  });
  expect(await fresh(venue, card(4), shown)).toEqual({ kind: "quiet" });
  expect([...storage.values()].join("")).not.toMatch(
    /MANUAL123|counter-secret/,
  );
});

it("ignores redemption, its reversal and an undone stamp", async () => {
  await observeStampBalance(venue, card(6, 6, 1), shown);
  for (const update of [card(0, 6, 2), card(6, 6, 3), card(5, 5, 4)]) {
    expect(await observeStampBalance(venue, update, shown)).toEqual({
      kind: "quiet",
    });
  }
  expect(await observeStampBalance(venue, card(6, 6, 5), shown)).toEqual({
    kind: "earned",
    count: 1,
  });
});

it("keeps venues, replacement memberships and unauthenticated sessions separate", async () => {
  await observeStampBalance(venue, card(2), shown);
  expect(await observeStampBalance(venue + "-other", card(3), shown)).toEqual({
    kind: "quiet",
  });
  expect(
    await observeStampBalance(venue, card(3, 3, 3, "new-member"), shown),
  ).toEqual({ kind: "quiet" });
  await observeStampBalance(venue, null, shown);
  expect(
    await observeStampBalance(venue, card(4, 4, 4, "new-member"), shown),
  ).toEqual({ kind: "quiet" });
});

it("preserves unseen gains during hidden or superseded requests and rejects an older reply", async () => {
  await observeStampBalance(venue, card(2), shown);
  expect(await observeStampBalance(venue, card(5), () => false)).toEqual({
    kind: "quiet",
  });
  expect(await observeStampBalance(venue, card(5), shown)).toEqual({
    kind: "earned",
    count: 3,
  });
  expect(await observeStampBalance(venue, card(3), shown)).toMatchObject({
    kind: "stale",
    previous: { stamps: 5 },
  });
  expect(await observeStampBalance(venue, card(5), shown)).toEqual({
    kind: "quiet",
  });
});

it("does not print a receipt for historical, malformed or changed reward programs", async () => {
  await observeStampBalance(venue, card(2), shown);
  expect(
    await observeStampBalance(venue, { ...card(4), updatedAt: "" }, shown),
  ).toEqual({ kind: "quiet" });
  expect(
    await observeStampBalance(venue, { ...card(4), goal: 8 }, shown),
  ).toEqual({ kind: "quiet" });
});

it("handles storage restrictions with in-page confirmation", async () => {
  vi.stubGlobal("localStorage", {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
  });
  await observeStampBalance(venue, card(2), shown);
  expect(await observeStampBalance(venue, card(3), shown)).toEqual({
    kind: "earned",
    count: 1,
  });
});

it("counts a visible test scan just once when the guest opens their card again", async () => {
  await observeStampBalance(venue, card(2), shown);
  await observeStampBalance(venue, card(3), shown);
  expect(await observeStampBalance(venue, card(3), shown)).toEqual({
    kind: "quiet",
  });
});

it("does not replay when a full store can read the old balance but cannot write the new one", async () => {
  await observeStampBalance(venue, card(2), shown);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem() {
      throw new Error("Quota exceeded");
    },
  });
  expect(await observeStampBalance(venue, card(3), shown)).toEqual({
    kind: "earned",
    count: 1,
  });
  expect(await observeStampBalance(venue, card(3), shown)).toEqual({
    kind: "quiet",
  });
});
