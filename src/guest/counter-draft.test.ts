import { describe, expect, it } from "vitest";
import {
  adjustCounterDraft,
  counterDraftKey,
  counterLifetime,
  counterQuantityLimit,
  counterTotal,
  emptyCounterDraft,
  readCounterDraft,
  saveCounterDraft,
} from "./counter-draft";

const items = new Set(["matylda", "crunch"]);
const now = 1_800_000_000_000;
function storage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

describe("Sweeto counter list draft", () => {
  it("persists quantities, isolates venues, expires, and clears empty drafts", () => {
    const store = storage();
    let draft = adjustCounterDraft(emptyCounterDraft(), "matylda", 1, now);
    draft = adjustCounterDraft(draft, "matylda", 1, now);
    draft = adjustCounterDraft(draft, "crunch", 1, now);
    expect(counterTotal(draft)).toBe(3);
    saveCounterDraft(store, "sweeto", draft);
    expect(readCounterDraft(store, "sweeto", items, now + 10)).toEqual(draft);
    expect(readCounterDraft(store, "other", items, now)).toEqual(
      emptyCounterDraft(),
    );
    expect(
      readCounterDraft(store, "sweeto", items, now + counterLifetime),
    ).toEqual(emptyCounterDraft());
    draft = adjustCounterDraft(draft, "matylda", -1, now);
    draft = adjustCounterDraft(draft, "matylda", -1, now);
    draft = adjustCounterDraft(draft, "crunch", -1, now);
    saveCounterDraft(store, "sweeto", draft);
    expect(store.getItem(counterDraftKey("sweeto"))).toBeNull();
  });
  it("caps quantities and discards corrupt or unknown selections", () => {
    const store = storage();
    let draft = emptyCounterDraft();
    for (let count = 0; count < 150; count++)
      draft = adjustCounterDraft(draft, "matylda", 1, now);
    expect(draft.quantities.matylda).toBe(counterQuantityLimit);
    store.setItem(counterDraftKey("sweeto"), "invalid");
    expect(readCounterDraft(store, "sweeto", items, now)).toEqual(
      emptyCounterDraft(),
    );
    store.setItem(
      counterDraftKey("sweeto"),
      JSON.stringify({ quantities: { unknown: 1 }, expiresAt: now + 1 }),
    );
    expect(readCounterDraft(store, "sweeto", items, now)).toEqual(
      emptyCounterDraft(),
    );
  });
});
