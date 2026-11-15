import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { siteConfig } from "@/lib/site";

// Prerendered for the static export.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(locales.map((locale) => [locale, `${siteConfig.url}/${locale}`]));

  return locales.map((locale) => ({
    url: `${siteConfig.url}/${locale}`,
    changeFrequency: "monthly",
    priority: 1,
    alternates: { languages },
  }));
}
