import { localeNames, locales, type Locale } from "@/i18n/config";
import { setDashboardLocale } from "@/merchant/actions/locale";
import { cn } from "@/lib/utils";

/** Works without JavaScript: each language is a submit button on a server action. */
export function LanguageForm({ locale, label }: { locale: Locale; label: string }) {
  return (
    <form action={setDashboardLocale} aria-label={label} className="flex items-center rounded-full bg-leaf/[0.06] p-1">
      {locales.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="submit"
            name="locale"
            value={code}
            lang={code}
            aria-pressed={active}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors outline-none focus-visible:outline-3 focus-visible:outline-leaf",
              active ? "bg-leaf text-cream" : "text-leaf hover:bg-leaf/10",
            )}
          >
            <span aria-hidden="true">{code}</span>
            <span className="sr-only">{localeNames[code]}</span>
          </button>
        );
      })}
    </form>
  );
}
