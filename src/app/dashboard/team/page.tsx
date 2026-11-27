import { Suspense } from "react";
import { DashboardFrame, DashboardFrameFallback } from "@/components/dashboard/dashboard-frame";
import { Field, Notice, PageHeading, Panel, SelectField, pickMessage } from "@/components/dashboard/form";
import { Button } from "@/components/ui/button";
import { localeNames, locales } from "@/i18n/config";
import { inviteMember, revokeInvitation } from "@/merchant/actions/invitations";
import { changeMemberRole, removeMember } from "@/merchant/actions/team";
import {
  canEditSettings,
  canManageMember,
  invitableRoles,
  requireOrganization,
} from "@/merchant/auth/organization";
import { db } from "@/merchant/db";
import { getDashboardDictionary } from "@/merchant/i18n";

export default function TeamPage({ searchParams }: PageProps<"/dashboard/team">) {
  return (
    <Suspense fallback={<DashboardFrameFallback />}>
      <Team searchParams={searchParams} />
    </Suspense>
  );
}

async function Team({ searchParams }: Pick<PageProps<"/dashboard/team">, "searchParams">) {
  const context = await requireOrganization(canEditSettings);
  const [{ locale, t }, query, members, invitations] = await Promise.all([
    getDashboardDictionary(),
    searchParams,
    db.membership.findMany({
      where: { organizationId: context.organization.id },
      select: { id: true, role: true, createdAt: true, user: { select: { id: true, email: true, name: true } } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    db.invitation.findMany({
      where: {
        organizationId: context.organization.id,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, email: true, role: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const notice = pickMessage(t.team.notices, query.notice);
  const error = pickMessage(t.team.errors, query.error);
  const dateFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" });
  const assignable = invitableRoles(context.role);
  const roleOptions = assignable.map((role) => ({ value: role, label: t.roles[role].name }));

  return (
    <DashboardFrame locale={locale} t={t} user={context.user} context={context} current="team">
      <PageHeading eyebrow={context.organization.name} title={t.team.title} body={t.team.body} />

      {notice || error ? (
        <div className="mb-6">
          <Notice tone={error ? "error" : "success"}>{error ?? notice}</Notice>
        </div>
      ) : null}

      <Panel id="members-title" title={t.team.membersTitle}>
        <ul className="divide-y divide-border">
          {members.map((member) => {
            const self = member.user.id === context.user.id;
            const manageable = !self && canManageMember(context.role, member.role);
            return (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {member.user.name ?? member.user.email}
                    {self ? <span className="ml-2 text-sm font-normal text-muted-foreground">({t.team.you})</span> : null}
                  </p>
                  {member.user.name ? <p className="truncate text-sm text-muted-foreground">{member.user.email}</p> : null}
                </div>
                {manageable ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={changeMemberRole} className="flex items-center gap-2">
                      <input type="hidden" name="membershipId" value={member.id} />
                      <label htmlFor={`role-${member.id}`} className="sr-only">
                        {t.team.roleLabel}: {member.user.email}
                      </label>
                      <select
                        id={`role-${member.id}`}
                        name="role"
                        defaultValue={member.role}
                        className="h-9 rounded-xl border border-border bg-white/70 px-2 text-sm"
                      >
                        {roleOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="outline" size="sm" className="h-9 px-3">
                        {t.team.changeRole}
                      </Button>
                    </form>
                    <details className="group relative">
                      <summary className="flex h-9 cursor-pointer list-none items-center rounded-full px-3 text-sm font-semibold text-destructive outline-none hover:bg-destructive/10 focus-visible:outline-3 focus-visible:outline-leaf">
                        {t.team.remove}
                      </summary>
                      <form
                        action={removeMember}
                        className="absolute right-0 z-10 mt-2 w-64 rounded-2xl border border-border bg-card p-4 shadow-lg"
                      >
                        <input type="hidden" name="membershipId" value={member.id} />
                        <p className="text-sm leading-relaxed">{t.team.removeConfirm(member.user.email)}</p>
                        <Button type="submit" variant="destructive" size="sm" className="mt-3 h-9 px-3">
                          {t.team.removeConfirmButton}
                        </Button>
                      </form>
                    </details>
                  </div>
                ) : (
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">{t.roles[member.role].name}</span>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel id="pending-title" title={t.team.pendingTitle} className="mt-6">
        {invitations.length === 0 ? (
          <p className="text-muted-foreground">{t.team.pendingEmpty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{invitation.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {t.roles[invitation.role].name} · {t.team.expires} {dateFormat.format(invitation.expiresAt)}
                  </p>
                </div>
                {canManageMember(context.role, invitation.role) ? (
                  <form action={revokeInvitation}>
                    <input type="hidden" name="invitationId" value={invitation.id} />
                    <Button type="submit" variant="outline" size="sm" className="h-9 px-3">
                      {t.team.revoke}
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel id="invite-title" title={t.team.inviteTitle} description={t.team.inviteBody} className="mt-6">
        <form action={inviteMember} className="grid gap-5 sm:grid-cols-2">
          <Field
            id="invite-email"
            name="email"
            type="email"
            label={t.team.emailLabel}
            autoComplete="off"
            required
            className="sm:col-span-2"
          />
          <SelectField id="invite-role" name="role" label={t.team.roleLabel} options={roleOptions} defaultValue={assignable.at(-1)} />
          <SelectField
            id="invite-locale"
            name="locale"
            label={t.team.languageLabel}
            defaultValue={locale}
            options={locales.map((code) => ({ value: code, label: localeNames[code] }))}
          />
          <ul className="grid gap-1 text-sm text-muted-foreground sm:col-span-2">
            {assignable.map((role) => (
              <li key={role}>
                <span className="font-semibold text-leaf">{t.roles[role].name}:</span> {t.roles[role].body}
              </li>
            ))}
          </ul>
          <div className="sm:col-span-2">
            <Button type="submit" size="lg">
              {t.team.inviteSubmit}
            </Button>
          </div>
        </form>
      </Panel>
    </DashboardFrame>
  );
}
