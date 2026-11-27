import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { DashboardFrameFallback } from "@/components/dashboard/dashboard-frame";
import { Field, Panel, pickMessage } from "@/components/dashboard/form";
import { VenueSettingsPage } from "@/components/dashboard/venue-settings-page";
import { Button } from "@/components/ui/button";
import { saveReviews } from "@/merchant/actions/venue-settings";
import { getDashboardDictionary } from "@/merchant/i18n";
import { getVenueDraft, requireVenue } from "@/merchant/venues";

export default function ReviewsPage(props: PageProps<"/dashboard/venues/[slug]/reviews">) {
  return (
    <Suspense fallback={<DashboardFrameFallback />}>
      <Reviews {...props} />
    </Suspense>
  );
}

async function Reviews({ params, searchParams }: PageProps<"/dashboard/venues/[slug]/reviews">) {
  const { context, venue } = await requireVenue((await params).slug);
  const [{ locale, t }, query, draft] = await Promise.all([getDashboardDictionary(), searchParams, getVenueDraft(venue.id)]);
  const copy = t.venue.reviews;

  return (
    <VenueSettingsPage
      locale={locale}
      t={t}
      context={context}
      venue={venue}
      section="reviews"
      title={copy.title}
      body={copy.body}
      notice={pickMessage(t.venue.notices, query.notice)}
      error={pickMessage(copy.errors, query.error)}
      draft={draft}
    >
      <Panel id="review-link-title" title={copy.formTitle}>
        <form action={saveReviews} className="grid gap-5">
          <input type="hidden" name="venueId" value={venue.id} />
          <Field
            id="review-url"
            name="reviewUrl"
            type="url"
            label={copy.linkLabel}
            hint={copy.linkHint}
            defaultValue={draft.reviewUrl}
            placeholder="https://g.page/r/…/review"
            spellCheck={false}
          />
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" size="lg">
              {t.venue.save}
            </Button>
            {draft.reviewUrl ? (
              <a
                href={draft.reviewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
              >
                {copy.test}
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            ) : null}
          </div>
        </form>
      </Panel>

      <Panel id="review-how-title" title={copy.howTitle}>
        <ol className="grid list-decimal gap-2 pl-5 leading-relaxed text-muted-foreground marker:font-semibold marker:text-leaf">
          {copy.howSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Panel>
    </VenueSettingsPage>
  );
}
