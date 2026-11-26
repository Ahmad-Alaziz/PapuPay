import { describe, expect, it } from "vitest";
import { parseRecoveryLink } from "./recovery-link";

const path = "/v/sweeto/restore";
const token = `${"a".repeat(32)}.1.${"b".repeat(43)}`;

describe("Wallet recovery links", () => {
  it("accepts exactly the seven offline Sweeto balances", () => {
    for (let stamps = 0; stamps <= 6; stamps++) {
      expect(parseRecoveryLink(path, `#demo=sweeto-testflight-v1.${stamps}`)).toEqual({ kind: "demo", stamps });
    }
  });

  it("accepts the same public snapshot on the main card after handoff and reload", () => {
    expect(parseRecoveryLink("/v/sweeto/card", "#demo=sweeto-testflight-v1.3")).toEqual({ kind: "demo", stamps: 3 });
    expect(parseRecoveryLink("/v/sweeto/card", "#demo=sweeto-testflight-saved")).toEqual({ kind: "savedDemo" });
    expect(parseRecoveryLink("/v/sweeto/card", "#token=" + token)).toBeNull();
  });

  it("never promotes a demo link to a live membership", () => {
    const demo = "#demo=sweeto-testflight-v1.3";
    for (const hash of [demo + "&token=" + token, "#token=" + token + "&demo=3", demo + "\n", demo + "0", demo.replace(".3", ".7"), "#demo=3", ""]) {
      expect(parseRecoveryLink(path, hash)).toBeNull();
    }
    for (const wrongPath of ["/v/elsewhere/restore", "/v/maka-maslo/restore"]) {
      expect(parseRecoveryLink(wrongPath, demo)).toBeNull();
    }
  });

  it("passes only canonical live fragments to the venue recovery service", () => {
    expect(parseRecoveryLink("/v/cafe/restore", "#token=" + token)).toEqual({ kind: "live", token });
    for (const hash of ["#token=broken", "#token=" + token + "%0A", "#token=" + token + "&token=" + token]) {
      expect(parseRecoveryLink(path, hash)).toBeNull();
    }
    expect(parseRecoveryLink("/v/cafe/card", "#token=" + token)).toBeNull();
  });
});

it("reopens a saved demo only on Sweeto's explicit browser route", () => {
  expect(parseRecoveryLink(path, "#demo=sweeto-testflight-saved")).toEqual({ kind: "savedDemo" });
  expect(parseRecoveryLink("/v/other/restore", "#demo=sweeto-testflight-saved")).toBeNull();
});
