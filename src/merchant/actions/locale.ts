"use server";

import { cookies } from "next/headers";
import { hasLocale, localeCookie } from "@/i18n/config";

/** Saves the dashboard language. Shared with the landing page's cookie. */
export async function setDashboardLocale(formData: FormData) {
  const locale = formData.get("locale");
  if (typeof locale !== "string" || !hasLocale(locale)) return;
  (await cookies()).set(localeCookie, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
