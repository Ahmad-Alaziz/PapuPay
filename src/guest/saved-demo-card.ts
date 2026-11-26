const storageKey = "papupay.testflight.sweeto.saved-card.v1";
export const savedDemoFragment = "#demo=sweeto-testflight-saved";
export const savedDemoChanged = "sweeto-saved-demo-changed";

export function readSavedDemo(storage: Pick<Storage, "getItem">): number | null {
  const value = storage.getItem(storageKey);
  return value !== null && /^[0-6]$/.test(value) ? Number(value) : null;
}

export function saveDemo(
  storage: Pick<Storage, "setItem" | "getItem">,
  stamps: number,
  expected: number | null,
) {
  if (!Number.isInteger(stamps) || stamps < 0 || stamps > 6) throw new Error("Invalid demo balance");
  if (readSavedDemo(storage) !== expected) return false;
  storage.setItem(storageKey, String(stamps));
  if (readSavedDemo(storage) !== stamps) throw new Error("Demo storage unavailable");
  return true;
}

export function browserDemo() {
  try { return readSavedDemo(window.localStorage); } catch { return null; }
}

export function subscribeDemo(update: () => void) {
  window.addEventListener("storage", update);
  window.addEventListener(savedDemoChanged, update);
  return () => {
    window.removeEventListener("storage", update);
    window.removeEventListener(savedDemoChanged, update);
  };
}
