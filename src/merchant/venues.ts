import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { canEditSettings, requireOrganization } from "./auth/organization";
import { db } from "./db";
import { decryptSecret } from "./secrets";
import { publicUrl } from "./storage";
import { menuLanguages, themePresets, type MenuLanguage, type ThemePreset } from "./venue-rules";

/** A venue of the current organisation that the user may configure, or a 404. */
export async function requireVenue(slug: string) {
  const context = await requireOrganization(canEditSettings);
  const venue = context.organization.venues.find((v) => v.slug === slug);
  if (!venue) notFound();
  return { context, venue };
}

/** Same check for actions, which receive the venue's ID. */
export async function requireVenueById(venueId: unknown) {
  const context = await requireOrganization(canEditSettings);
  const venue = context.organization.venues.find((v) => v.id === venueId);
  return venue ? { context, venue } : null;
}

/** The draft settings with file URLs resolved. Missing rows read as defaults. */
export const getVenueDraft = cache(async (venueId: string) => {
  const settings = await db.venueSettings.findUnique({ where: { venueId } });
  const assetIds = [
    settings?.logoAssetId,
    settings?.logoWhiteAssetId,
    settings?.bannerAssetId,
    settings?.menuPdfPlAssetId,
    settings?.menuPdfEnAssetId,
    settings?.menuPdfRuAssetId,
  ].filter((id): id is string => Boolean(id));
  const rows = await db.asset.findMany({
    where: { id: { in: assetIds }, venueId },
    select: { id: true, storagePath: true, contentType: true, width: true, height: true, byteSize: true },
  });
  const assets = new Map(rows.map((row) => [row.id, { ...row, url: publicUrl(row.storagePath) }]));
  const asset = (id: string | null | undefined) => (id ? (assets.get(id) ?? null) : null);

  const preset = (Object.hasOwn(themePresets, settings?.themePreset ?? "") ? settings!.themePreset : "sweeto") as ThemePreset;
  const menuPdf = Object.fromEntries(
    menuLanguages.map((language) => [
      language,
      asset(
        { pl: settings?.menuPdfPlAssetId, en: settings?.menuPdfEnAssetId, ru: settings?.menuPdfRuAssetId }[language],
      ),
    ]),
  ) as Record<MenuLanguage, ReturnType<typeof asset>>;

  return {
    address: settings?.address ?? "",
    mapUrl: settings?.mapUrl ?? "",
    logo: asset(settings?.logoAssetId),
    logoWhite: asset(settings?.logoWhiteAssetId),
    banner: asset(settings?.bannerAssetId),
    themePreset: preset,
    font: settings?.font ?? null,
    wifi: settings?.wifiSsid && settings.wifiSecurity
      ? {
          ssid: settings.wifiSsid,
          security: settings.wifiSecurity,
          hidden: settings.wifiHidden,
          hasPassword: Boolean(settings.wifiPasswordEncrypted),
        }
      : null,
    reviewUrl: settings?.reviewUrl ?? "",
    menuPdf,
    updatedAt: settings?.updatedAt ?? null,
  };
});

export type VenueDraft = Awaited<ReturnType<typeof getVenueDraft>>;

/** The saved Wi-Fi password, for the test QR. Only call after requireVenue. */
export async function getWifiPassword(venueId: string) {
  const settings = await db.venueSettings.findUnique({
    where: { venueId },
    select: { wifiPasswordEncrypted: true },
  });
  return settings?.wifiPasswordEncrypted ? decryptSecret(settings.wifiPasswordEncrypted, venueId) : "";
}

/** What's set up, for the overview checklist and the phone preview. */
export function draftChecklist(draft: VenueDraft) {
  return {
    banner: Boolean(draft.banner),
    logo: Boolean(draft.logo),
    wifi: Boolean(draft.wifi),
    reviews: Boolean(draft.reviewUrl),
    menu: Object.values(draft.menuPdf).some(Boolean),
  };
}
