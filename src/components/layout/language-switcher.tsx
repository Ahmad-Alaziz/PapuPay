"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { localeCookie, localeNames, locales, type Locale } from "@/i18n/config";

type Props = {
  locale: Locale;
  label: string;
  className?: string;
};

function rememberLocale(locale: Locale) {
  document.cookie = `${localeCookie}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageSwitcher({ locale, label, className }: Props) {
  return (
    <nav aria-label={label} className={cn("flex items-center rounded-full bg-leaf/[0.06] p-1", className)}>
      {locales.map((code) => {
        const active = code === locale;
        return (
          <Link
            key={code}
            href={`/${code}`}
            hrefLang={code}
            lang={code}
            aria-current={active ? "page" : undefined}
            onClick={() => rememberLocale(code)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors outline-none focus-visible:outline-3 focus-visible:outline-leaf",
              active ? "bg-leaf text-cream" : "text-leaf hover:bg-leaf/10",
            )}
          >
            <span aria-hidden="true">{code}</span>
            <span className="sr-only">{localeNames[code]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
