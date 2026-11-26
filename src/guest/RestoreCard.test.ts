import { afterEach, expect, it, vi } from "vitest";
import { checkRestore, openMembership } from "./RestoreCard";

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

it("opens the same signed-in account without issuing another session", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await openMembership(base, "example", { status: "ready", preview, currentCode: preview.code }, new AbortController().signal);
  expect(fetch).not.toHaveBeenCalled();
});

it("sends an empty-session expectation before auto-restoring a new device and verifies its cookie", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(Response.json({ card: preview })).mockResolvedValueOnce(Response.json({ card: preview }));
  vi.stubGlobal("fetch", fetch);
  await openMembership(base, "example", { status: "ready", preview }, new AbortController().signal);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ token: "example", expectedCurrentCode: null });
  expect(fetch.mock.calls[1][0]).toBe(base + "/loyalty/card");
});
