import { Suspense } from "react";
import Link from "next/link";
import { CircleCheck, CircleDashed, ExternalLink } from "lucide-react";
import { DashboardFrame, DashboardFrameFallback } from "@/components/dashboard/dashboard-frame";
import { PageHeading, Panel } from "@/components/dashboard/form";
import { canEditSettings, getOrganizationContext } from "@/merchant/auth/organization";
import { requireUser } from "@/merchant/auth/session";
import { db } from "@/merchant/db";
import { getDashboardDictionary } from "@/merchant/i18n";
import { draftChecklist, getVenueDraft } from "@/merchant/venues";
import { cn } from "@/lib/utils";

export default function DashboardHome() {
  return (
    <Suspense fallback={<DashboardFrameFallback />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const user = await requireUser();
  const [{ locale, t }, context] = await Promise.all([getDashboardDictionary(), getOrganizationContext()]);
  const { home } = t;
  const venues = context
    ? await Promise.all(
        (
          await db.venue.findMany({
            where: { organizationId: context.organization.id },
            select: { id: true, name: true, slug: true, status: true },
            orderBy: { createdAt: "asc" },
          })
        ).map(async (venue) => ({ ...venue, checklist: draftChecklist(await getVenueDraft(venue.id)) })),
      )
    : [];
  const checklistLinks = { banner: "branding", logo: "branding", wifi: "wifi", reviews: "reviews", menu: "menu" } as const;

  return (
    <DashboardFrame locale={locale} t={t} user={user} context={context} current="overview">
      {!context ? (
        <PageHeading
          title={home.noOrganizationTitle}
          body={user.isPlatformAdmin ? home.adminHint : home.noOrganizationBody}
        />
      ) : !canEditSettings(context.role) ? (
        <PageHeading eyebrow={context.organization.name} title={home.staffTitle} body={home.staffBody} />
      ) : (
        <>
          <PageHeading eyebrow={context.organization.name} title={home.title} body={home.body} />

          <Panel id="venues-title" title={home.venuesTitle}>
            <ul className="grid gap-3">
              {venues.map((venue) => (
                <li key={venue.id} className="rounded-2xl bg-muted/60 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{venue.name}</p>
                      <Link
                        href={`/v/${venue.slug}`}
                        target="_blank"
                        className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:underline"
                      >
                        {home.guestLink}: papupay.com/v/{venue.slug}
                        <ExternalLink aria-hidden="true" className="size-3.5" />
                      </Link>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-bold",
                        venue.status === "LIVE" ? "bg-secondary text-leaf" : "bg-leaf/[0.07] text-leaf/70",
                      )}
                    >
                      {home.status[venue.status]}
                    </span>
                  </div>
                  {canEditSettings(context.role) ? (
                    <div className="mt-4 border-t border-border/70 pt-4">
                      <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{t.venue.checklistTitle}</p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {(Object.keys(checklistLinks) as (keyof typeof checklistLinks)[]).map((item) => {
                          const done = venue.checklist[item];
                          const Icon = done ? CircleCheck : CircleDashed;
                          return (
                            <li key={item}>
                              <Link
                                href={`/dashboard/venues/${venue.slug}/${checklistLinks[item]}`}
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold outline-none focus-visible:outline-3 focus-visible:outline-leaf",
                                  done ? "bg-secondary text-leaf" : "bg-white/80 text-leaf/70 hover:text-leaf",
                                )}
                              >
                                <Icon aria-hidden="true" className="size-4" />
                                {t.venue.checklist[item]}
                                <span className="sr-only">{done ? " ✓" : ` (${t.venue.edit})`}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            id="progress-title"
            title={home.progressTitle}
            description={home.progressBody}
            className="mt-6"
          >
            <ol className="grid gap-4 sm:grid-cols-2">
              {home.steps.map((step, index) => (
                <li key={step.title} className="flex gap-4 rounded-2xl bg-muted/60 p-5">
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-leaf font-heading text-sm font-bold text-cream"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </>
      )}
    </DashboardFrame>
  );
}
