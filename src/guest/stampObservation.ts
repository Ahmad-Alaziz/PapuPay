import type { LoyaltyCard } from "./api";

type Checkpoint = Pick<LoyaltyCard, "stamps" | "goal" | "visits"> & {
  membership: string;
  updated: number;
};
type Change =
  | { kind: "quiet" }
  | { kind: "earned"; count: number }
  | { kind: "stale"; previous: Checkpoint };

const quiet: Change = { kind: "quiet" };
const memory = new Map<string, Checkpoint>();
const unsaved = new Set<string>();

function read(key: string, persistent: boolean): Checkpoint | undefined {
  if (persistent && !unsaved.has(key)) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return undefined;
      const value = JSON.parse(raw) as Checkpoint;
      if (
        typeof value.membership === "string" &&
        value.goal > 0 &&
        value.stamps >= 0 &&
        value.stamps <= value.goal &&
        value.stamps <= value.visits &&
        [value.stamps, value.goal, value.visits, value.updated].every(
          Number.isSafeInteger,
        )
      )
        return value;
    } catch {
      /* Private browsing can restrict storage. */
    }
  }
  return memory.get(key);
}

function write(
  key: string,
  value: Checkpoint | undefined,
  persistent: boolean,
) {
  if (value) memory.set(key, value);
  else memory.delete(key);
  if (!persistent) return;
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
    unsaved.delete(key);
  } catch {
    // A readable but quota-limited store may still contain an older observation.
    unsaved.add(key);
  }
}

// Record only balances actually presented on checkout or in the simulation.
// localStorage is origin-scoped. Each venue has one current membership checkpoint.
export async function observeStampBalance(
  apiBase: string,
  card: LoyaltyCard | null,
  isCurrent: () => boolean,
): Promise<Change> {
  const key = "papupay.observed-stamps.v1." + apiBase;
  let persistent = !!globalThis.crypto?.subtle;
  let next: Checkpoint | undefined;
  if (card) {
    const updated = Date.parse(card.updatedAt);
    if (
      !card.checkout ||
      ![card.stamps, card.goal, card.visits, updated].every(
        Number.isSafeInteger,
      ) ||
      card.stamps < 0 ||
      card.goal < 1 ||
      card.stamps > card.goal ||
      card.visits < card.stamps ||
      card.rewardAvailable !== (card.stamps === card.goal)
    )
      return quiet;
    let digest: ArrayBuffer | undefined;
    if (persistent) {
      try {
        digest = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(apiBase + "|" + card.checkout),
        );
      } catch {
        persistent = false;
      }
    }
    // In an insecure local preview, keep the membership comparison in page memory only.
    const membership = digest
      ? Array.from(new Uint8Array(digest), (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join("")
      : card.checkout;
    next = {
      membership,
      stamps: card.stamps,
      visits: card.visits,
      goal: card.goal,
      updated,
    };
  }
  function record(): Change {
    if (!isCurrent()) return quiet;
    if (!next) {
      write(key, undefined, true);
      return quiet;
    }
    const previous = read(key, persistent);
    if (
      previous?.membership === next.membership &&
      next.updated < previous.updated
    ) {
      return { kind: "stale", previous };
    }
    if (
      previous?.membership === next.membership &&
      previous.updated === next.updated &&
      previous.stamps === next.stamps &&
      previous.visits === next.visits &&
      previous.goal === next.goal &&
      !unsaved.has(key)
    )
      return quiet;
    write(key, next, persistent);
    if (
      !previous ||
      previous.membership !== next.membership ||
      previous.goal !== next.goal
    )
      return quiet;
    const gained = next.stamps - previous.stamps;
    return gained > 0 && next.visits - previous.visits === gained
      ? { kind: "earned", count: gained }
      : quiet;
  }
  // Serialize the read and write when two visible tabs receive the same stamp.
  try {
    if (globalThis.navigator?.locks)
      return await navigator.locks.request(key, record);
  } catch {
    /* Some browsing modes restrict Web Locks. */
  }
  return record();
}
