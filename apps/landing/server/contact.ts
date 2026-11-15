/**
 * POST /api/contact. The site is a static export, so this runs as a Vercel Function
 * (`api/contact.ts` at the repository root) rather than a Next.js route handler.
 * Imports stay relative: the function is compiled outside the Next.js build.
 */
import { z } from "zod";
import { locales } from "../src/i18n/config";
import { contactLimits, honeypotField, type ContactResponse } from "../src/lib/contact";
import { sendContactEmail } from "./mailjet";
import { createRateLimiter } from "./rate-limit";

const MAX_BODY_BYTES = 16 * 1024;

const rateLimit = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 });

// Strip line breaks from single-line fields so they can't be used for header injection.
const singleLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

const contactSchema = z.object({
  name: z.string().max(contactLimits.name).transform(singleLine).optional().default(""),
  email: z.email().max(contactLimits.email).transform(singleLine),
  message: z.string().trim().min(contactLimits.messageMin).max(contactLimits.messageMax),
  locale: z.enum(locales).catch("en"),
  [honeypotField]: z.string().max(500).optional(),
});

function reply(body: ContactResponse, status: number, headers?: HeadersInit) {
  return Response.json(body, { status, headers });
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function handleContact(request: Request): Promise<Response> {
  const { allowed, retryAfterSeconds } = rateLimit(clientIp(request));
  if (!allowed) {
    return reply({ ok: false, error: "rate_limited" }, 429, { "Retry-After": String(retryAfterSeconds) });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return reply({ ok: false, error: "validation" }, 413);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return reply({ ok: false, error: "validation" }, 400);
  }

  const parsed = contactSchema.safeParse(json);
  if (!parsed.success) {
    return reply({ ok: false, error: "validation" }, 400);
  }

  const { name, email, message, locale } = parsed.data;

  // Bots fill every field. Pretend it worked so they don't adapt.
  if (parsed.data[honeypotField]) {
    return reply({ ok: true }, 200);
  }

  try {
    await sendContactEmail({ name, email, message, locale });
    return reply({ ok: true }, 200);
  } catch (error) {
    console.error("[contact] failed to send message:", error instanceof Error ? error.message : error);
    return reply({ ok: false, error: "server" }, 500);
  }
}
