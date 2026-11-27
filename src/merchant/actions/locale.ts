"use server";

import { cookies } from "next/headers";
import { hasLocale, localeCookie } from "@/i18n/config";
import { getCurrentUser } from "@/merchant/auth/session";
import { db } from "@/merchant/db";

/**
 * Saves the dashboard language in the cookie shared with the landing page, and
 * on the account when signed in so sign-in emails use the same language.
 */
export async function setDashboardLocale(formData: FormData) {
  const locale = formData.get("locale");
  if (typeof locale !== "string" || !hasLocale(locale)) return;
  (await cookies()).set(localeCookie, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  const user = await getCurrentUser();
  if (user && user.locale !== locale) await db.user.update({ where: { id: user.id }, data: { locale } });
}
