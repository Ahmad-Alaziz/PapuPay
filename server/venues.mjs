import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const defaultVenueId = "sweeto";
export const venueIdPattern = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

const defaultTheme = {
  background: "#fffcf7", ink: "#0c477b", accent: "#1765a8", muted: "#647382", surface: "#e8f0f8", font: "bricolage",
};
const themePalette = {
  sweeto: defaultTheme,
  berry: { ...defaultTheme, background: "#fff8fb", ink: "#64344e", accent: "#98546d", surface: "#f1dde7", muted: "#7c5970", font: "serif" },
  forest: { ...defaultTheme, background: "#f7faf4", ink: "#173c2b", accent: "#3d735a", surface: "#e2ede4", muted: "#5c7060", font: "system" },
};
const sweeto = {
  id: defaultVenueId,
  name: "Sweeto",
  address: "Puławska 246 / 8, Warszawa",
  logoUrl: "/assets/sweeto/logo-blue.png",
  logoWhiteUrl: "/assets/sweeto/logo-white.png",
  photoUrl: "/assets/sweeto/matylda-puddle.webp",
  photoMotion: "sauce-drip",
  photoDrip: { x: 0.733, y: 0.99, width: 0.077, color: "#581f08" },
  mapUrl: "https://www.google.com/maps?cid=12629433022150019195",
  walletLocation: { latitude: 52.1720425, longitude: 21.0185431 },
  menuFallback: "/assets/sweeto/menu.pdf",
  menuImageUrl: "/assets/sweeto/menu-original.jpg",
  reviewUrl: "https://search.google.com/local/writereview?placeid=ChIJZSkE8-IzGUcRewjXh2vCRK8",
  theme: defaultTheme,
};

function publicAsset(value) {
  if (typeof value !== "string") return null;
  if (/^\/(?![\\/])[\w./@%-]+$/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function cleanBrand(venue) {
  const fallback = venue.id === defaultVenueId ? sweeto : {};
  const address = typeof venue.address === "string" ? venue.address.slice(0, 160) : (fallback.address ?? "");
  const mapUrl = publicAsset(venue.mapUrl ?? fallback.mapUrl);
  const sameAddress = address === fallback.address && mapUrl === fallback.mapUrl;
  const pin = Object.hasOwn(venue, "walletLocation") ? venue.walletLocation : sameAddress ? fallback.walletLocation : null;
  const hasPin = Number.isFinite(pin?.latitude) && Math.abs(pin.latitude) <= 90
    && Number.isFinite(pin.longitude) && Math.abs(pin.longitude) <= 180;
  const logoUrl = publicAsset(venue.logoUrl ?? fallback.logoUrl);
  const photoUrl = publicAsset(venue.photoUrl ?? fallback.photoUrl);
  const photoMotion = Object.hasOwn(venue, "photoMotion")
    ? venue.photoMotion
    : venue.photoUrl == null ? fallback.photoMotion : undefined;
  const photoDrip = venue.photoDrip ?? (photoUrl === fallback.photoUrl ? fallback.photoDrip : undefined);
  const hasSauceDrip = photoUrl && ["sauce-drip", "chocolate-drip"].includes(photoMotion)
    && typeof photoDrip?.x === "number" && photoDrip.x >= 0.1 && photoDrip.x <= 0.9
    && (photoDrip.y == null || (typeof photoDrip.y === "number" && photoDrip.y >= 0.8 && photoDrip.y <= 1))
    && (photoDrip.width == null || (typeof photoDrip.width === "number" && photoDrip.width >= 0.01 && photoDrip.width <= 0.2))
    && typeof photoDrip.color === "string" && /^#[0-9a-f]{6}$/i.test(photoDrip.color);
  const motionTheme = Object.hasOwn(themePalette, venue.theme?.motionTheme) ? venue.theme.motionTheme : "sweeto";
  const theme = Object.fromEntries(Object.entries(themePalette[motionTheme]).map(([key, value]) => {
    const requested = venue.theme?.[key];
    const valid = key === "font" ? ["bricolage", "dm-sans", "manrope", "serif", "system"].includes(requested) : /^#[0-9a-f]{6}$/i.test(requested ?? "");
    return [key, valid ? requested : value];
  }));
  return {
    id: venue.id,
    name: venue.name,
    address,
    logoUrl,
    logoWhiteUrl: publicAsset(venue.logoWhiteUrl ?? (logoUrl === fallback.logoUrl ? fallback.logoWhiteUrl : undefined)),
    photoUrl,
    ...(hasSauceDrip ? { photoMotion: "sauce-drip", photoDrip: { x: photoDrip.x, y: photoDrip.y ?? 1, width: photoDrip.width ?? 0.04, color: photoDrip.color } } : {}),
    mapUrl,
    ...(hasPin ? { walletLocation: { latitude: pin.latitude, longitude: pin.longitude } } : {}),
    menuFallback: publicAsset(venue.menuFallback ?? fallback.menuFallback),
    menuImageUrl: publicAsset(venue.menuImageUrl ?? fallback.menuImageUrl),
    theme: { ...theme, motionTheme },
  };
}

export function loadVenues(venueFile) {
  return venueFile ? JSON.parse(readFileSync(venueFile, "utf8")) : [];
}

export function venueRegistry(configured = []) {
  if (!Array.isArray(configured)) throw new Error("PAPUPAY_VENUES_FILE must contain an array of venues.");
  const venues = new Map([[defaultVenueId, { brand: cleanBrand(sweeto), settings: sweeto }]]);
  const seen = new Set();
  for (const venue of configured) {
    if (!venue || typeof venue.id !== "string" || !venueIdPattern.test(venue.id) || seen.has(venue.id)
      || typeof venue.name !== "string" || !venue.name.trim() || venue.name.length > 80) {
      throw new Error("Venue IDs and names must be valid and unique.");
    }
    seen.add(venue.id);
    venues.set(venue.id, { brand: cleanBrand(venue), settings: venue.id === defaultVenueId ? { ...sweeto, ...venue } : venue });
  }
  return venues;
}

export function venueEnvironment(id, env) {
  return (key) => env[`PAPUPAY_VENUE_${id.toUpperCase().replaceAll("-", "_")}_${key}`];
}

export function defaultVenueDatabase(id, demo) {
  return fileURLToPath(new URL(`../build/papupay-${id}${demo ? "-demo" : ""}.sqlite`, import.meta.url));
}
