import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import type { Locale } from "@/i18n/config";
import type { DashboardDictionary } from "@/merchant/i18n";
import { DashboardNav } from "./dashboard-nav";
import { LanguageForm } from "./language-form";

/** Sidebar, top bar and content area shared by every dashboard page. */
export function DashboardFrame({
  locale,
  t,
  current,
  children,
}: {
  locale: Locale;
  t: DashboardDictionary;
  current: keyof DashboardDictionary["nav"];
  children: ReactNode;
}) {
  return (
    <div lang={locale} className="min-h-dvh lg:grid lg:grid-cols-[18rem_1fr]">
      <a
        href="#content"
        className="sr-only z-50 rounded-full bg-leaf px-5 py-3 font-semibold text-cream focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        {t.shell.skip}
      </a>
      <aside className="border-b border-border bg-card/70 px-4 pt-4 pb-3 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-8 lg:border-r lg:border-b-0 lg:px-5 lg:py-7">
        <div className="mb-4 flex items-center justify-between gap-3 lg:mb-0">
          <Link
            href="/dashboard"
            aria-label="PapuPay"
            className="rounded-xl outline-none focus-visible:outline-3 focus-visible:outline-leaf"
          >
            <Logo className="[&_svg]:size-8 [&>span]:text-[1.45rem]" />
          </Link>
          <LanguageForm locale={locale} label={t.shell.languageLabel} />
        </div>
        <DashboardNav nav={t.nav} label={t.shell.navLabel} soon={t.shell.soon} current={current} />
      </aside>
      <main id="content" tabIndex={-1} className="px-4 py-8 outline-none sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}

/** Static placeholder shown while the request-dependent shell streams in. */
export function DashboardFrameFallback() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[18rem_1fr]" aria-busy="true">
      <div className="h-32 border-b border-border bg-card/70 lg:h-dvh lg:border-r lg:border-b-0" />
      <div className="px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="h-4 w-32 animate-pulse rounded-full bg-muted" />
          <div className="h-10 w-3/4 animate-pulse rounded-2xl bg-muted" />
          <div className="h-5 w-2/3 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}
