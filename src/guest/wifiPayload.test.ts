import jsQR from "jsqr";
import { create } from "qrcode";
import { describe, expect, it } from "vitest";
import { wifiQrPayload, type WifiSettings } from "./wifiPayload";

function readNetworkCode(settings: WifiSettings) {
  const { modules } = create(wifiQrPayload(settings), { errorCorrectionLevel: "M" });
  const padding = 4;
  const scale = 4;
  const size = (modules.size + padding * 2) * scale;
  const buffer = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const row = Math.floor(y / scale) - padding;
      const column = Math.floor(x / scale) - padding;
      const inside = row >= 0 && column >= 0 && row < modules.size && column < modules.size;
      if (!inside || !modules.get(row, column)) continue;
      const offset = (y * size + x) * 4;
      buffer.fill(0, offset, offset + 3);
    }
  }
  const scanned = jsQR(buffer, size, size)?.data;
  if (!scanned) throw new Error("Could not decode the Wi-Fi QR code");
  expect(scanned).toMatch(/^WIFI:.*;;$/);
  return Object.fromEntries([...scanned.slice(5).matchAll(/([A-Z]):((?:\\.|[^\\;])*);/gu)]
    .map(([, tag, value]) => [tag, value.replace(/\\(.)/gu, "$1")]));
}

describe("Wi-Fi QR payload", () => {
  it("round-trips Unicode credentials and literal reserved characters through a scanned QR", () => {
    const settings = { ssid: 'Gość;"Cafe"', password: "example:,\\suffix", security: "WPA", hidden: false } as const;
    expect(readNetworkCode(settings)).toEqual({ T: settings.security, S: settings.ssid, P: settings.password, H: "false" });
  });

  it("preserves numeric WPA passphrases, hexadecimal-looking SSIDs and raw keys exactly", () => {
    const settings = { ssid: "CAFE", password: "12345678901234567890", security: "WPA", hidden: true } as const;
    expect(readNetworkCode(settings)).toEqual({ T: settings.security, S: settings.ssid, P: settings.password, H: "true" });

    const rawKey = "abc12345".repeat(8);
    expect(readNetworkCode({ ...settings, password: rawKey }).P).toBe(rawKey);
  });

  it("omits the password field for an open network", () => {
    expect(readNetworkCode({ ssid: "Guest", password: "", security: "nopass", hidden: false }))
      .toEqual({ T: "nopass", S: "Guest", H: "false" });
  });
});
