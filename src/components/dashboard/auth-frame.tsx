import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import type { Locale } from "@/i18n/config";
import { LanguageForm } from "./language-form";

/** Centered card for signed-out pages: sign-in, link confirmation, invitations. */
export function AuthFrame({
  locale,
  languageLabel,
  children,
}: {
  locale: Locale;
  languageLabel: string;
  children: ReactNode;
}) {
  return (
    <div lang={locale} className="flex min-h-dvh flex-col px-4 py-6 sm:px-8">
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        <Logo className="[&_svg]:size-8 [&>span]:text-[1.45rem]" />
        <LanguageForm locale={locale} label={languageLabel} />
      </div>
      <main id="content" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_24px_60px_-40px_rgb(23_61_43/0.45)] sm:p-9">
          {children}
        </div>
      </main>
    </div>
  );
}

export function AuthFrameFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4" aria-busy="true">
      <div className="h-72 w-full max-w-md animate-pulse rounded-[2rem] bg-muted" />
    </div>
  );
}
