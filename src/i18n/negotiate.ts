import { defaultLocale, hasLocale, type Locale } from "./config";

/** Picks the saved language cookie first, then the best Accept-Language match. */
export function negotiateLocale(
  saved: string | undefined | null,
  acceptLanguage: string | undefined | null,
): Locale {
  if (hasLocale(saved)) return saved;

  const ranked = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return {
        lang: tag.toLowerCase().split("-")[0],
        q: q ? Number(q.trim().slice(2)) || 0 : 1,
      };
    })
    .filter((entry) => entry.lang && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  return ranked.map((entry) => entry.lang).find(hasLocale) ?? defaultLocale;
}
