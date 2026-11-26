import { describe, expect, it } from "vitest";
import { guestPath, guestRoute, venueId } from "./route";

describe("Sweeto signage", () => {
  it("opens the right guest surface for every printed placement", () => {
    expect(guestRoute("/go/sweeto/table")).toEqual({
      view: "home",
      placement: "table",
    });
    expect(guestRoute("/go/sweeto/counter")).toEqual({
      view: "card",
      placement: "counter",
    });
    expect(guestRoute("/go/sweeto/menu")).toEqual({ view: "menu" });
  });

  it("keeps direct guest links stable and never takes an unrelated sign to Sweeto", () => {
    for (const view of ["home", "menu", "card", "reviews", "wifi"] as const) {
      expect(guestRoute(guestPath(view))).toEqual({ view });
    }
    expect(guestRoute("/v/maka-maslo")).toEqual({ view: "home" });
    expect(guestRoute("/go/sweeto/typo")).toEqual({ view: "missing" });
    expect(guestRoute("/go/koszyki/24")).toEqual({ view: "missing" });
  });

  it("keeps the venue identity through guest and printed routes", () => {
    for (const id of ["a", "counter-two", "maka-maslo-two"]) {
      for (const view of [
        "home",
        "menu",
        "card",
        "wallet",
        "test",
        "restore",
        "wifi",
      ] as const) {
        const path = guestPath(view, id);
        expect(venueId(path)).toBe(id);
        expect(guestRoute(path)).toEqual({ view });
      }
      expect(guestRoute(`/go/${id}/counter`)).toEqual({
        view: "card",
        placement: "counter",
      });
    }
  });

  it("rejects malformed or ambiguous venue routes", () => {
    for (const path of [
      "/v/-/card",
      "/v/ending-/card",
      "/v/a//card",
      "/v/a%2Fb/card",
      `/v/${"a".repeat(33)}/card`,
    ]) {
      expect(guestRoute(path)).toEqual({ view: "missing" });
    }
  });
});
