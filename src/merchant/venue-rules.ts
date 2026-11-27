// Rules shared by the dashboard forms and the published venue configuration.
// They mirror what the guest apps accept (server/venues.mjs and server/api.mjs),
// so anything saved here is something the App Clip and web app can show.

export const themePresets = {
  sweeto: { background: "#fffcf7", ink: "#0c477b", accent: "#1765a8", muted: "#647382", surface: "#e8f0f8", font: "bricolage" },
  berry: { background: "#fff8fb", ink: "#64344e", accent: "#98546d", muted: "#7c5970", surface: "#f1dde7", font: "serif" },
  forest: { background: "#f7faf4", ink: "#173c2b", accent: "#3d735a", muted: "#5c7060", surface: "#e2ede4", font: "system" },
} as const;
export type ThemePreset = keyof typeof themePresets;
export const themePresetNames = Object.keys(themePresets) as ThemePreset[];

export const fonts = ["bricolage", "dm-sans", "manrope", "serif", "system"] as const;
export type Font = (typeof fonts)[number];

export const menuLanguages = ["pl", "en", "ru"] as const;
export type MenuLanguage = (typeof menuLanguages)[number];

export const uploadRules = {
  LOGO: { types: ["image/png", "image/jpeg", "image/webp"], maxBytes: 5 * 1024 * 1024 },
  LOGO_WHITE: { types: ["image/png", "image/jpeg", "image/webp"], maxBytes: 5 * 1024 * 1024 },
  BANNER: { types: ["image/png", "image/jpeg", "image/webp"], maxBytes: 5 * 1024 * 1024 },
  MENU_PDF: { types: ["application/pdf"], maxBytes: 15 * 1024 * 1024 },
} as const;
export type UploadKind = keyof typeof uploadRules;

const extensions: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
export const extensionFor = (contentType: string) => extensions[contentType];

/** Google review links the guest apps open. Same rules as configuredReviewLink in server/api.mjs. */
export function validReviewLink(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port || url.username || url.password) return null;
    const { hostname, pathname } = url;
    if (hostname === "g.page" && /^\/r\/[\w-]+\/review\/?$/.test(pathname)) return url.href;
    if (hostname === "search.google.com" && pathname === "/local/writereview" && url.searchParams.get("placeid")) {
      return url.href;
    }
    if (hostname === "maps.app.goo.gl" && /^\/[\w-]+\/?$/.test(pathname)) return url.href;
    if (hostname === "goo.gl" && /^\/maps\/[\w-]+\/?$/.test(pathname)) return url.href;
    if (["www.google.com", "www.google.pl"].includes(hostname) && pathname.startsWith("/maps/place/")) return url.href;
    return null;
  } catch {
    return null;
  }
}

/** Google Maps links for the venue's address. */
export function validMapLink(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port || url.username || url.password) return null;
    const { hostname, pathname } = url;
    if (hostname === "maps.app.goo.gl" || (hostname === "goo.gl" && pathname.startsWith("/maps/"))) return url.href;
    if (hostname === "maps.google.com") return url.href;
    if (/^(www\.)?google\.[a-z.]{2,6}$/.test(hostname) && pathname.startsWith("/maps")) return url.href;
    return null;
  } catch {
    return null;
  }
}

const byteLength = (value: string) => new TextEncoder().encode(value).length;
const hasControlCharacters = (value: string) => /[\u0000-\u001f\u007f-\u009f]/.test(value);

/** Wi-Fi credentials the guest apps can join. Same rules as configuredWifi in server/api.mjs. */
export function wifiProblem(ssid: string, security: "WPA" | "WEP" | "NOPASS", password: string) {
  if (!ssid || byteLength(ssid) > 32 || hasControlCharacters(ssid)) return "ssid" as const;
  if (security === "NOPASS") return null;
  if (!password || byteLength(password) > 64 || hasControlCharacters(password)) return "password" as const;
  if (security === "WPA") {
    const bytes = byteLength(password);
    if (bytes < 8 || (bytes > 63 && !/^[\da-f]{64}$/i.test(password))) return "password" as const;
  }
  return null;
}

/** Escapes a value for the WIFI: QR format phones understand. */
export function wifiQrPayload(ssid: string, security: "WPA" | "WEP" | "NOPASS", password: string, hidden: boolean) {
  const escape = (value: string) => value.replace(/([\\;,:"])/g, "\\$1");
  const type = security === "NOPASS" ? "nopass" : security;
  return `WIFI:T:${type};S:${escape(ssid)};${security === "NOPASS" ? "" : `P:${escape(password)};`}${hidden ? "H:true;" : ""};`;
}
