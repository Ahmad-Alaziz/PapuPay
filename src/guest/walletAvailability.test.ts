import { describe, expect, it } from "vitest";
import {
  canOpenAppleWallet,
  readGoogleSaveURL,
  readWalletAvailability,
} from "./walletAvailability";

const base = "/api/v/sweeto";
const applePass = `${base}/loyalty/apple-wallet.pkpass`;
const googleSave =
  "https://pay.google.com/gp/v/save/eyJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJnb29nbGUifQ.fixture";

describe("wallet links", () => {
  it("keeps Apple downloads tenant-scoped while allowing Google independently", () => {
    expect(
      readWalletAvailability({ status: "ready", passUrl: applePass }, base),
    ).toMatchObject({
      status: "ready",
      passUrl: applePass,
      googleStatus: "unconfigured",
    });
    for (const passUrl of [
      "/api/v/other/loyalty/apple-wallet.pkpass",
      "https://example.test/loyalty/apple-wallet.pkpass",
      null,
    ]) {
      expect(
        readWalletAvailability(
          { status: "ready", passUrl, googleStatus: "ready" },
          base,
        ),
      ).toMatchObject({
        status: "error",
        passUrl: null,
        googleStatus: "ready",
      });
    }
    expect(readWalletAvailability(null, base).status).toBe("error");
  });

  it("allows only canonical Google Save URLs with bounded tokens", () => {
    expect(readGoogleSaveURL({ url: googleSave })).toBe(googleSave);
    for (const url of [
      "https://pay.google.com.example.test/gp/v/save/x.y.z",
      "https://pay.google.com@example.test/gp/v/save/x.y.z",
      "https://pay.google.com:443/gp/v/save/x.y.z",
      "https://pay.google.com/gp/v/save/x.y.z?redirect=https://example.test",
      "https://pay.google.com/gp/v/save/x.y.z\n",
      "https://pay.google.com/gp/v/save/x.y",
      `https://pay.google.com/gp/v/save/x.y.${"z".repeat(1800)}`,
      null,
    ]) {
      expect(readGoogleSaveURL({ url })).toBeNull();
    }
  });

  it("offers on-device Apple add on iPhone, iPad and Mac only", () => {
    expect(
      canOpenAppleWallet(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      ),
    ).toBe(true);
    expect(
      canOpenAppleWallet("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"),
    ).toBe(true);
    expect(canOpenAppleWallet("Mozilla/5.0 (Linux; Android 15; Pixel 8)")).toBe(
      false,
    );
    expect(
      canOpenAppleWallet(
        "Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; iPhone)",
      ),
    ).toBe(false);
    expect(canOpenAppleWallet("")).toBe(false);
  });
});
