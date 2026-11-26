export const counterLifetime = 2 * 60 * 60 * 1000;
export const counterQuantityLimit = 99;

export type CounterDraft = {
  quantities: Record<string, number>;
  expiresAt: number;
};
export type CounterStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export function emptyCounterDraft(): CounterDraft {
  return { quantities: {}, expiresAt: 0 };
}

export function counterDraftKey(venue: string) {
  return "papupay.counter-draft.v1." + venue;
}

export function counterTotal(draft: CounterDraft) {
  return Object.values(draft.quantities).reduce(
    (total, quantity) => total + quantity,
    0,
  );
}

export function readCounterDraft(
  storage: CounterStorage,
  venue: string,
  itemIDs: ReadonlySet<string>,
  now = Date.now(),
): CounterDraft {
  const raw = storage.getItem(counterDraftKey(venue));
  if (!raw) return emptyCounterDraft();
  let value: CounterDraft;
  try {
    value = JSON.parse(raw) as CounterDraft;
  } catch {
    return emptyCounterDraft();
  }
  if (
    !value ||
    typeof value.expiresAt !== "number" ||
    !Number.isFinite(value.expiresAt) ||
    value.expiresAt <= now ||
    value.expiresAt > now + counterLifetime ||
    !value.quantities ||
    typeof value.quantities !== "object" ||
    Array.isArray(value.quantities) ||
    Object.entries(value.quantities).some(
      ([id, count]) =>
        !itemIDs.has(id) ||
        !Number.isInteger(count) ||
        count < 1 ||
        count > counterQuantityLimit,
    )
  ) {
    return emptyCounterDraft();
  }
  return value;
}

export function saveCounterDraft(
  storage: CounterStorage,
  venue: string,
  draft: CounterDraft,
) {
  if (counterTotal(draft) === 0) storage.removeItem(counterDraftKey(venue));
  else storage.setItem(counterDraftKey(venue), JSON.stringify(draft));
}

export function adjustCounterDraft(
  draft: CounterDraft,
  id: string,
  delta: 1 | -1,
  now = Date.now(),
): CounterDraft {
  const current = draft.expiresAt > now ? draft : emptyCounterDraft();
  const previous = current.quantities[id] ?? 0;
  const quantity = Math.min(
    counterQuantityLimit,
    Math.max(0, previous + delta),
  );
  if (quantity === previous) return current;
  const quantities = { ...current.quantities };
  if (quantity > 0) quantities[id] = quantity;
  else delete quantities[id];
  return {
    quantities,
    expiresAt: Object.keys(quantities).length ? now + counterLifetime : 0,
  };
}
