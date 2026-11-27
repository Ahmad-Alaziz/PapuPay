import { Suspense } from "react";
import { DashboardFrame, DashboardFrameFallback } from "@/components/dashboard/dashboard-frame";
import { Field, Notice, PageHeading, Panel, SelectField, pickMessage } from "@/components/dashboard/form";
import { Button } from "@/components/ui/button";
import { localeNames, locales } from "@/i18n/config";
import { createOrganization } from "@/merchant/actions/admin";
import { switchOrganization } from "@/merchant/actions/team";
import { getOrganizationContext, requirePlatformAdmin } from "@/merchant/auth/organization";
import { db } from "@/merchant/db";
import { getDashboardDictionary } from "@/merchant/i18n";

export default function AdminPage({ searchParams }: PageProps<"/dashboard/admin">) {
  return (
    <Suspense fallback={<DashboardFrameFallback />}>
      <Admin searchParams={searchParams} />
    </Suspense>
  );
}

async function Admin({ searchParams }: Pick<PageProps<"/dashboard/admin">, "searchParams">) {
  const user = await requirePlatformAdmin();
  const [{ locale, t }, context, query, organizations] = await Promise.all([
    getDashboardDictionary(),
    getOrganizationContext(),
    searchParams,
    db.organization.findMany({
      select: {
        id: true,
        name: true,
        venues: { select: { slug: true }, orderBy: { createdAt: "asc" } },
        _count: { select: { memberships: true } },
        invitations: { where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const notice = pickMessage(t.admin.notices, query.notice);
  const error = pickMessage(t.admin.errors, query.error);

  return (
    <DashboardFrame locale={locale} t={t} user={user} context={context} current="admin">
      <PageHeading title={t.admin.title} body={t.admin.body} />

      {notice || error ? (
        <div className="mb-6">
          <Notice tone={error ? "error" : "success"}>{error ?? notice}</Notice>
        </div>
      ) : null}

      <Panel id="create-title" title={t.admin.createTitle}>
        <form action={createOrganization} className="grid gap-5 sm:grid-cols-2">
          <Field
            id="organization-name"
            name="organizationName"
            label={t.admin.organizationName}
            hint={t.admin.organizationHint}
            required
            minLength={2}
            maxLength={80}
          />
          <Field
            id="venue-name"
            name="venueName"
            label={t.admin.venueName}
            hint={t.admin.venueNameHint}
            required
            minLength={2}
            maxLength={80}
          />
          <Field
            id="venue-slug"
            name="venueSlug"
            label={t.admin.venueSlug}
            hint={t.admin.venueSlugHint}
            required
            pattern="[a-z0-9][a-z0-9\-]{1,30}[a-z0-9]"
            autoCapitalize="none"
            spellCheck={false}
            className="sm:col-span-2"
          />
          <Field
            id="owner-email"
            name="ownerEmail"
            type="email"
            label={t.admin.ownerEmail}
            autoComplete="off"
            required
          />
          <SelectField
            id="owner-locale"
            name="locale"
            label={t.admin.ownerLanguage}
            defaultValue="pl"
            options={locales.map((code) => ({ value: code, label: localeNames[code] }))}
          />
          <div className="sm:col-span-2">
            <Button type="submit" size="lg">
              {t.admin.submit}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel id="organizations-title" title={t.admin.listTitle} className="mt-6">
        {organizations.length === 0 ? (
          <p className="text-muted-foreground">{t.admin.listEmpty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {organizations.map((organization) => (
              <li
                key={organization.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{organization.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {organization.venues.map((venue) => `/v/${venue.slug}`).join(", ")} · {t.admin.members}{" "}
                    {organization._count.memberships} · {t.admin.pendingInvites} {organization.invitations.length}
                  </p>
                </div>
                <form action={switchOrganization}>
                  <input type="hidden" name="organizationId" value={organization.id} />
                  <Button type="submit" variant="outline" size="sm" className="h-9 px-3">
                    {t.admin.open}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </DashboardFrame>
  );
}
