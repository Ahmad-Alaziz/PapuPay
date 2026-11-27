import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email());

export const localeSchema = z.enum(["pl", "en"]);
export const roleSchema = z.enum(["OWNER", "MANAGER", "STAFF"]);
export const idSchema = z.uuid();

/** Same rule as the guest app's /v/<slug> routes, but at least 3 characters. */
export const venueSlugPattern = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

// First path segments and names we keep for PapuPay itself.
const reservedSlugs = new Set([
  "admin", "api", "app", "clip", "dashboard", "demo", "go", "help", "login", "papupay",
  "staff", "support", "test", "v", "www",
]);

export const venueSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(venueSlugPattern)
  .refine((slug) => !reservedSlugs.has(slug));

export const nameSchema = z.string().trim().min(2).max(80);

export const createOrganizationSchema = z.object({
  organizationName: nameSchema,
  venueName: nameSchema,
  venueSlug: venueSlugSchema,
  ownerEmail: emailSchema,
  locale: localeSchema,
});

export const invitationSchema = z.object({
  email: emailSchema,
  role: roleSchema,
  locale: localeSchema,
});
