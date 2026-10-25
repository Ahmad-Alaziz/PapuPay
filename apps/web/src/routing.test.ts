import { describe, expect, it } from "vitest";
import { resolveRoute, qrPath } from "./routing";
describe("printed QR routing", () => {
  const route = (path: string) =>
    resolveRoute(new URL(path, "https://papupay.com"));
  it("separates the public homepage, chooser, and table ordering", () => {
    expect(route("/")).toEqual({ kind: "landing" });
    expect(route("/app")).toEqual({ kind: "choose" });
    expect(route(qrPath("37"))).toEqual({
      kind: "order",
      context: { venueId: "koszyki", table: "37" },
    });
    expect(route("/go/koszyki/024/")).toEqual({
      kind: "order",
      context: { venueId: "koszyki", table: "24" },
    });
  });
  it.each([
    "/go/other-hall/24",
    "/go/koszyki/0",
    "/go/koszyki/1000",
    "/go/koszyki/2x",
    "/go/koszyki",
    "/go/koszyki/24/extra",
    "/go/koszyki/24?table=37",
    "/go/koszyki/24?venue=other",
    "/app?venue=unknown&table=24",
    "/app?venue=koszyki",
    "/app?table=2&table=3",
    "/app?venue=koszyki&venue=other&table=24",
    "/unknown",
  ])("rejects ambiguous or invalid context: %s", (path) => {
    expect(route(path).kind).toBe("invalid");
  });
  it.each([
    "/?table=24",
    "/clip?venue=koszyki&table=24",
    "/app?venue=koszyki&table=24",
  ])("preserves old demo links: %s", (path) => {
    expect(route(path)).toEqual({
      kind: "order",
      context: { venueId: "koszyki", table: "24" },
    });
  });
});
