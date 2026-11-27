import { Suspense } from "react";
import { AssetUpload } from "@/components/dashboard/asset-upload";
import { DashboardFrameFallback } from "@/components/dashboard/dashboard-frame";
import { Panel, pickMessage } from "@/components/dashboard/form";
import { VenueSettingsPage } from "@/components/dashboard/venue-settings-page";
import { getDashboardDictionary } from "@/merchant/i18n";
import { menuLanguages } from "@/merchant/venue-rules";
import { getVenueDraft, requireVenue } from "@/merchant/venues";

export default function MenuPage(props: PageProps<"/dashboard/venues/[slug]/menu">) {
  return (
    <Suspense fallback={<DashboardFrameFallback />}>
      <Menu {...props} />
    </Suspense>
  );
}

async function Menu({ params, searchParams }: PageProps<"/dashboard/venues/[slug]/menu">) {
  const { context, venue } = await requireVenue((await params).slug);
  const [{ locale, t }, query, draft] = await Promise.all([getDashboardDictionary(), searchParams, getVenueDraft(venue.id)]);
  const copy = t.venue.menu;

  return (
    <VenueSettingsPage
      locale={locale}
      t={t}
      context={context}
      venue={venue}
      section="menu"
      title={copy.title}
      body={copy.body}
      notice={pickMessage(t.venue.notices, query.notice)}
      draft={draft}
    >
      {menuLanguages.map((language) => (
        <Panel
          key={language}
          id={`menu-${language}-title`}
          title={copy.languages[language]}
          description={language === "pl" ? copy.requiredNote : undefined}
        >
          <AssetUpload
            venueId={venue.id}
            kind="MENU_PDF"
            language={language}
            current={draft.menuPdf[language]}
            accept="application/pdf"
            hint={t.venue.upload.pdfHint}
            labels={t.venue.upload}
            title={`${copy.title} (${copy.languages[language]})`}
          />
        </Panel>
      ))}
    </VenueSettingsPage>
  );
}
