import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { OrganizationContext } from "@/merchant/auth/organization";
import type { DashboardDictionary } from "@/merchant/i18n";
import type { VenueDraft } from "@/merchant/venues";
import { DashboardFrame } from "./dashboard-frame";
import type { DashboardSection } from "./dashboard-nav";
import { Notice, PageHeading } from "./form";
import { PhonePreview } from "./phone-preview";

/** Frame for each venue settings page: heading, result message, forms and the phone preview. */
export function VenueSettingsPage({
  locale,
  t,
  context,
  venue,
  section,
  title,
  body,
  notice,
  error,
  draft,
  children,
}: {
  locale: Locale;
  t: DashboardDictionary;
  context: OrganizationContext;
  venue: { id: string; slug: string; name: string };
  section: DashboardSection;
  title: string;
  body: string;
  notice?: string;
  error?: string;
  draft: VenueDraft;
  children: ReactNode;
}) {
  return (
    <DashboardFrame locale={locale} t={t} user={context.user} context={context} current={section} venueSlug={venue.slug} wide>
      <PageHeading eyebrow={venue.name} title={title} body={body} />
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid min-w-0 content-start gap-6">
          {notice || error ? <Notice tone={error ? "error" : "success"}>{error ?? notice}</Notice> : null}
          {children}
          <p className="text-sm leading-relaxed text-muted-foreground">{t.venue.draftNote}</p>
        </div>
        <aside className="xl:sticky xl:top-12 xl:self-start">
          <PhonePreview name={venue.name} draft={draft} t={t.venue} />
        </aside>
      </div>
    </DashboardFrame>
  );
}
