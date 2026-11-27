import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { localeCookie, type Locale } from "@/i18n/config";
import { negotiateLocale } from "@/i18n/negotiate";
import { en, type DashboardDictionary } from "./en";
import { pl } from "./pl";

const dictionaries: Record<Locale, DashboardDictionary> = { en, pl };

/**
 * The dashboard shares the landing page's language cookie, falling back to the
 * browser's languages. Reads request data, so call it inside a Suspense boundary.
 */
export const getDashboardLocale = cache(async (): Promise<Locale> => {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  return negotiateLocale(cookieStore.get(localeCookie)?.value, headerList.get("accept-language"));
});

export async function getDashboardDictionary() {
  const locale = await getDashboardLocale();
  return { locale, t: dictionaries[locale] };
}

export type { DashboardDictionary };
