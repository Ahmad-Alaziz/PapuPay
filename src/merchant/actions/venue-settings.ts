"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { audit } from "@/merchant/audit";
import { db } from "@/merchant/db";
import { encryptSecret } from "@/merchant/secrets";
import { createSignedUpload, deleteStoredObject, matchesSignature, readFileStart, storedObject } from "@/merchant/storage";
import {
  extensionFor,
  fonts,
  menuLanguages,
  themePresetNames,
  uploadRules,
  validMapLink,
  validReviewLink,
  wifiProblem,
  type MenuLanguage,
  type UploadKind,
} from "@/merchant/venue-rules";
import { requireVenueById } from "@/merchant/venues";
import { nameSchema } from "@/merchant/validation";

type SettingsColumns = Omit<Prisma.VenueSettingsUncheckedCreateInput, "venueId" | "updatedAt">;

/** Saves draft fields and records who changed which ones. */
async function saveDraft(
  venueId: string,
  organizationId: string,
  actorId: string,
  /** Audit action, e.g. "venue.wifi_updated". */
  action: string,
  data: SettingsColumns,
  extra?: (tx: Prisma.TransactionClient) => Promise<unknown>,
) {
  await db.$transaction(async (tx) => {
    await tx.venueSettings.upsert({
      where: { venueId },
      create: { venueId, ...data, updatedById: actorId },
      update: { ...data, updatedById: actorId },
    });
    await extra?.(tx);
    await audit(
      {
        action,
        actorId,
        organizationId,
        targetType: "venue",
        targetId: venueId,
        metadata: { fields: Object.keys(data) },
      },
      tx,
    );
  });
}

async function venueFromForm(formData: FormData) {
  const access = await requireVenueById(formData.get("venueId"));
  if (!access) redirect("/dashboard");
  return access;
}

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
};

export async function saveBranding(formData: FormData) {
  const { context, venue } = await venueFromForm(formData);
  const page = `/dashboard/venues/${venue.slug}/branding`;

  const name = nameSchema.safeParse(formData.get("venueName"));
  const address = text(formData, "address");
  const mapInput = text(formData, "mapUrl");
  const mapUrl = mapInput ? validMapLink(mapInput) : null;
  const preset = text(formData, "themePreset");
  const font = text(formData, "font");

  if (!name.success) redirect(`${page}?error=name`);
  if (address.length > 160) redirect(`${page}?error=address`);
  if (mapInput && !mapUrl) redirect(`${page}?error=map`);
  if (!themePresetNames.includes(preset as never)) redirect(`${page}?error=invalid`);
  if (font && !fonts.includes(font as never)) redirect(`${page}?error=invalid`);

  await saveDraft(
    venue.id,
    context.organization.id,
    context.user.id,
    "venue.branding_updated",
    { address: address || null, mapUrl, themePreset: preset, font: font || null },
    (tx) => tx.venue.update({ where: { id: venue.id }, data: { name: name.data } }),
  );
  redirect(`${page}?notice=saved`);
}

export async function saveWifi(formData: FormData) {
  const { context, venue } = await venueFromForm(formData);
  const page = `/dashboard/venues/${venue.slug}/wifi`;

  if (formData.get("intent") === "clear") {
    await saveDraft(venue.id, context.organization.id, context.user.id, "venue.wifi_updated", {
      wifiSsid: null,
      wifiSecurity: null,
      wifiPasswordEncrypted: null,
      wifiHidden: false,
    });
    redirect(`${page}?notice=cleared`);
  }

  const ssid = String(formData.get("ssid") ?? "");
  const security = z.enum(["WPA", "WEP", "NOPASS"]).safeParse(formData.get("security"));
  if (!security.success) redirect(`${page}?error=invalid`);
  const typed = String(formData.get("password") ?? "");
  const hidden = formData.get("hidden") === "on";

  // An empty password field keeps the saved one, so managers don't have to retype it.
  const current = await db.venueSettings.findUnique({
    where: { venueId: venue.id },
    select: { wifiPasswordEncrypted: true, wifiSecurity: true },
  });
  const keepPassword =
    !typed &&
    security.data !== "NOPASS" &&
    current?.wifiSecurity === security.data &&
    Boolean(current.wifiPasswordEncrypted);
  const problem = wifiProblem(ssid, security.data, keepPassword ? "unchanged-placeholder" : typed);
  if (problem) redirect(`${page}?error=${problem}`);

  await saveDraft(venue.id, context.organization.id, context.user.id, "venue.wifi_updated", {
    wifiSsid: ssid,
    wifiSecurity: security.data,
    wifiHidden: hidden,
    wifiPasswordEncrypted:
      security.data === "NOPASS"
        ? null
        : keepPassword
          ? current!.wifiPasswordEncrypted
          : encryptSecret(typed, venue.id),
  });
  redirect(`${page}?notice=saved`);
}

export async function saveReviews(formData: FormData) {
  const { context, venue } = await venueFromForm(formData);
  const page = `/dashboard/venues/${venue.slug}/reviews`;
  const input = text(formData, "reviewUrl");
  const reviewUrl = input ? validReviewLink(input) : null;
  if (input && !reviewUrl) redirect(`${page}?error=link`);

  await saveDraft(venue.id, context.organization.id, context.user.id, "venue.reviews_updated", { reviewUrl });
  redirect(`${page}?notice=${reviewUrl ? "saved" : "cleared"}`);
}

// File uploads. The browser asks for a signed URL, uploads the file straight
// to Storage, then asks the server to check it and attach it to the draft.

type UploadError = "forbidden" | "type" | "size" | "failed" | "mismatch";
export type UploadResult = { ok: true } | { ok: false; error: UploadError };

const uploadKind = z.enum(["LOGO", "LOGO_WHITE", "BANNER", "MENU_PDF"]);
const menuLanguage = z.enum(menuLanguages);

function column(kind: UploadKind, language?: MenuLanguage) {
  if (kind === "MENU_PDF") {
    return ({ pl: "menuPdfPlAssetId", en: "menuPdfEnAssetId", ru: "menuPdfRuAssetId" } as const)[language ?? "pl"];
  }
  return ({ LOGO: "logoAssetId", LOGO_WHITE: "logoWhiteAssetId", BANNER: "bannerAssetId" } as const)[kind];
}

function pathPattern(venueId: string, kind: UploadKind) {
  return new RegExp(`^venues/${venueId}/${kind.toLowerCase()}/[0-9a-f-]{36}\\.(png|jpg|webp|pdf)$`);
}

export async function prepareUpload(input: {
  venueId: string;
  kind: UploadKind;
  contentType: string;
  size: number;
}): Promise<{ ok: true; uploadUrl: string; path: string } | { ok: false; error: UploadError }> {
  const access = await requireVenueById(input.venueId);
  const kind = uploadKind.safeParse(input.kind);
  if (!access || !kind.success) return { ok: false, error: "forbidden" };
  const rules = uploadRules[kind.data];
  if (!(rules.types as readonly string[]).includes(input.contentType)) return { ok: false, error: "type" };
  if (!Number.isSafeInteger(input.size) || input.size <= 0 || input.size > rules.maxBytes) {
    return { ok: false, error: "size" };
  }

  const path = `venues/${access.venue.id}/${kind.data.toLowerCase()}/${randomUUID()}.${extensionFor(input.contentType)}`;
  try {
    return { ok: true, uploadUrl: await createSignedUpload(path), path };
  } catch (error) {
    console.error("Upload signing failed", error instanceof Error ? error.message : error);
    return { ok: false, error: "failed" };
  }
}

export async function confirmUpload(input: {
  venueId: string;
  kind: UploadKind;
  language?: MenuLanguage;
  path: string;
  width?: number;
  height?: number;
}): Promise<UploadResult> {
  const access = await requireVenueById(input.venueId);
  const kind = uploadKind.safeParse(input.kind);
  const language = input.kind === "MENU_PDF" ? menuLanguage.safeParse(input.language) : null;
  if (!access || !kind.success || (language && !language.success)) return { ok: false, error: "forbidden" };
  const { context, venue } = access;
  if (typeof input.path !== "string" || !pathPattern(venue.id, kind.data).test(input.path)) {
    return { ok: false, error: "forbidden" };
  }

  // Trust what Storage recorded and what the file starts with, not the browser.
  const rules = uploadRules[kind.data];
  const stored = await storedObject(input.path);
  if (!stored) return { ok: false, error: "failed" };
  const start = await readFileStart(input.path);
  const valid =
    (rules.types as readonly string[]).includes(stored.contentType) &&
    stored.size > 0 &&
    stored.size <= rules.maxBytes &&
    extensionFor(stored.contentType) === input.path.split(".").at(-1) &&
    start !== null &&
    matchesSignature(start, stored.contentType);
  if (!valid) {
    await deleteStoredObject(input.path);
    return { ok: false, error: "mismatch" };
  }

  const dimension = (value: unknown) =>
    typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 20_000 ? value : null;
  const field = column(kind.data, language?.data);

  await db.$transaction(async (tx) => {
    const asset = await tx.asset.create({
      data: {
        venueId: venue.id,
        kind: kind.data,
        storagePath: input.path,
        contentType: stored.contentType,
        byteSize: stored.size,
        width: dimension(input.width),
        height: dimension(input.height),
        language: language?.data ?? null,
        createdById: context.user.id,
      },
    });
    await tx.venueSettings.upsert({
      where: { venueId: venue.id },
      create: { venueId: venue.id, [field]: asset.id, updatedById: context.user.id },
      update: { [field]: asset.id, updatedById: context.user.id },
    });
    await audit(
      {
        action: "venue.file_uploaded",
        actorId: context.user.id,
        organizationId: context.organization.id,
        targetType: "asset",
        targetId: asset.id,
        metadata: { kind: kind.data, language: language?.data ?? null, bytes: stored.size },
      },
      tx,
    );
  });
  refresh();
  return { ok: true };
}

/** Detaches a file from the draft. The file stays, in case a published release uses it. */
export async function removeUpload(input: { venueId: string; kind: UploadKind; language?: MenuLanguage }): Promise<UploadResult> {
  const access = await requireVenueById(input.venueId);
  const kind = uploadKind.safeParse(input.kind);
  const language = input.kind === "MENU_PDF" ? menuLanguage.safeParse(input.language) : null;
  if (!access || !kind.success || (language && !language.success)) return { ok: false, error: "forbidden" };
  const { context, venue } = access;

  await saveDraft(venue.id, context.organization.id, context.user.id, "venue.file_removed", {
    [column(kind.data, language?.data)]: null,
  });
  refresh();
  return { ok: true };
}
