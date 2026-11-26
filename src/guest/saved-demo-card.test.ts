import { expect, it } from "vitest";
import { readSavedDemo, saveDemo } from "./saved-demo-card";

it("changes saved snapshots only after confirming the expected existing balance, including a new reward cycle", () => {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
  };
  expect(readSavedDemo(storage)).toBeNull();
  expect(saveDemo(storage, 6, null)).toBe(true);
  expect(saveDemo(storage, 0, null)).toBe(false);
  expect(saveDemo(storage, 0, 5)).toBe(false);
  expect(readSavedDemo(storage)).toBe(6);
  expect(saveDemo(storage, 0, 6)).toBe(true);
  expect(readSavedDemo(storage)).toBe(0);
  expect(() => saveDemo(storage, 7, 0)).toThrow();
});
