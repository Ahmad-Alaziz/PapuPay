import { afterEach, expect, it, vi } from "vitest";
import { checkRestore } from "./RestoreCard";

const base = "/api/v/sweeto";
const preview = { code: "DEMO1234", stamps: 2, goal: 6 };

afterEach(() => vi.unstubAllGlobals());

it("waits for the current browser card before making a preview actionable", async () => {
  let answerCurrentCard!: (response: Response) => void;
  const currentCard = new Promise<Response>((resolve) => {
    answerCurrentCard = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json(preview))
      .mockReturnValueOnce(currentCard),
  );

  const observed = vi.fn();
  const checking = checkRestore(
    base,
    "example",
    new AbortController().signal,
  ).then(observed);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  expect(observed).not.toHaveBeenCalled();

  answerCurrentCard(Response.json({ card: { code: "OTHER789" } }));
  await checking;
  expect(observed).toHaveBeenCalledWith({
    status: "ready",
    preview,
    currentCode: "OTHER789",
  });
});

it("keeps a valid preview non-actionable when the current card check fails", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json(preview))
      .mockRejectedValueOnce(new Error("Network unavailable")),
  );

  await expect(
    checkRestore(base, "example", new AbortController().signal),
  ).resolves.toEqual({ status: "error" });
});
