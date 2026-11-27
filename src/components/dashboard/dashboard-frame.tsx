import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import type { Locale } from "@/i18n/config";
import { signOut } from "@/merchant/actions/auth";
import { switchOrganization } from "@/merchant/actions/team";
import { canEditSettings, type OrganizationContext } from "@/merchant/auth/organization";
import type { CurrentUser } from "@/merchant/auth/session";
import type { DashboardDictionary } from "@/merchant/i18n";
import { DashboardNav, type DashboardSection } from "./dashboard-nav";
import { LanguageForm } from "./language-form";

function OrganizationCard({ context, t }: { context: OrganizationContext; t: DashboardDictionary }) {
  const others = context.user.memberships.filter((m) => m.organization.id !== context.organization.id);
  return (
    <div className="rounded-2xl bg-muted/70 p-4">
      <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{t.shell.organization}</p>
      <p className="mt-1 font-heading text-lg leading-tight font-bold">{context.organization.name}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t.roles[context.role].name}
        {context.viaPlatformAdmin ? ` · ${t.shell.adminAccess}` : ""}
      </p>
      {others.length > 0 ? (
        <form action={switchOrganization} className="mt-3 flex gap-2">
          <label htmlFor="organization-switch" className="sr-only">
            {t.shell.organization}
          </label>
          <select
            id="organization-switch"
            name="organizationId"
            defaultValue={context.organization.id}
            className="h-9 min-w-0 flex-1 rounded-xl border border-border bg-white/70 px-2 text-sm"
          >
            {context.user.memberships.map((m) => (
              <option key={m.organization.id} value={m.organization.id}>
                {m.organization.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-9 rounded-xl bg-leaf px-3 text-sm font-semibold text-cream outline-none hover:bg-leaf-soft focus-visible:outline-3 focus-visible:outline-leaf"
          >
            {t.shell.switchOrganization}
          </button>
        </form>
      ) : null}
    </div>
  );
}

/** Sidebar, top bar and content area shared by every signed-in dashboard page. */
export function DashboardFrame({
  locale,
  t,
  user,
  context,
  current,
  children,
}: {
  locale: Locale;
  t: DashboardDictionary;
  user: CurrentUser;
  context: OrganizationContext | null;
  current: DashboardSection;
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
      <aside className="border-b border-border bg-card/70 px-4 pt-4 pb-3 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-6 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-5 lg:py-7">
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
        {context ? (
          <div className="mb-4 hidden lg:mb-0 lg:block">
            <OrganizationCard context={context} t={t} />
          </div>
        ) : null}
        <DashboardNav
          t={t}
          current={current}
          showSettings={Boolean(context && canEditSettings(context.role))}
          showAdmin={user.isPlatformAdmin}
        />
        <div className="mt-auto hidden border-t border-border pt-5 lg:block">
          <p className="text-xs text-muted-foreground">{t.shell.signedInAs}</p>
          <p className="truncate text-sm font-semibold" title={user.email}>
            {user.email}
          </p>
          <form action={signOut} className="mt-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full px-1 text-sm font-semibold text-leaf/75 outline-none hover:text-leaf focus-visible:outline-3 focus-visible:outline-leaf"
            >
              <LogOut aria-hidden="true" className="size-4" />
              {t.shell.signOut}
            </button>
          </form>
        </div>
      </aside>
      <main id="content" tabIndex={-1} className="px-4 py-8 outline-none sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-4xl">
          {context ? (
            <div className="mb-8 lg:hidden">
              <OrganizationCard context={context} t={t} />
            </div>
          ) : null}
          {children}
          <form action={signOut} className="mt-12 border-t border-border pt-6 lg:hidden">
            <p className="text-sm text-muted-foreground">
              {t.shell.signedInAs} <span className="font-semibold text-leaf">{user.email}</span>
            </p>
            <button
              type="submit"
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-leaf outline-none focus-visible:outline-3 focus-visible:outline-leaf"
            >
              <LogOut aria-hidden="true" className="size-4" />
              {t.shell.signOut}
            </button>
          </form>
        </div>
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
