export const locales = ["en", "pl"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeCookie = "NEXT_LOCALE";

export const localeNames: Record<Locale, string> = {
  en: "English",
  pl: "Polski",
};

export const ogLocales: Record<Locale, string> = {
  en: "en_US",
  pl: "pl_PL",
};

export function hasLocale(value: string | undefined | null): value is Locale {
  return locales.includes(value as Locale);
}
