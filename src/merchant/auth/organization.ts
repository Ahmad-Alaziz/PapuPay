import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/merchant/db";
import { requireUser, type CurrentUser } from "./session";

const activeOrgCookie = "papupay_org";

/**
 * Roles, from most to least access:
 * - OWNER: everything, including adding or removing other owners.
 * - MANAGER: all venue settings and publishing; can invite and remove staff.
 * - STAFF: no dashboard settings; signs in only for the counter screen (later).
 * PapuPay platform admins act as an owner in every organisation.
 */
export function canEditSettings(role: Role) {
  return role === "OWNER" || role === "MANAGER";
}

export function invitableRoles(role: Role): Role[] {
  if (role === "OWNER") return ["OWNER", "MANAGER", "STAFF"];
  if (role === "MANAGER") return ["STAFF"];
  return [];
}

/** Whether `actor` may change or remove a member who currently has `target`. */
export function canManageMember(actor: Role, target: Role) {
  return actor === "OWNER" || (actor === "MANAGER" && target === "STAFF");
}

export type OrganizationContext = {
  user: CurrentUser;
  organization: { id: string; name: string; venues: { id: string; slug: string; name: string }[] };
  role: Role;
  /** True when a platform admin is working in an organisation they don't belong to. */
  viaPlatformAdmin: boolean;
};

/**
 * The organisation the dashboard is showing: the one chosen in the switcher if
 * the user still has access to it, otherwise their first membership.
 */
export const getOrganizationContext = cache(async (): Promise<OrganizationContext | null> => {
  const base = await resolveOrganization();
  if (!base) return null;
  const venues = await db.venue.findMany({
    where: { organizationId: base.organization.id },
    select: { id: true, slug: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  return { ...base, organization: { ...base.organization, venues } };
});

type ResolvedOrganization = Omit<OrganizationContext, "organization"> & { organization: { id: string; name: string } };

async function resolveOrganization(): Promise<ResolvedOrganization | null> {
  const user = await requireUser();
  const chosen = (await cookies()).get(activeOrgCookie)?.value;

  const fromMembership = (m: CurrentUser["memberships"][number]): ResolvedOrganization => ({
    user,
    organization: m.organization,
    role: m.role,
    viaPlatformAdmin: false,
  });

  const chosenMembership = user.memberships.find((m) => m.organization.id === chosen);
  if (chosenMembership) return fromMembership(chosenMembership);

  if (user.isPlatformAdmin && chosen && /^[0-9a-f-]{36}$/.test(chosen)) {
    const organization = await db.organization.findUnique({ where: { id: chosen }, select: { id: true, name: true } });
    if (organization) return { user, organization, role: "OWNER", viaPlatformAdmin: true };
  }

  const first = user.memberships[0];
  return first ? fromMembership(first) : null;
}

/** For pages and actions that need an organisation and a minimum role. */
export async function requireOrganization(check: (role: Role) => boolean = () => true) {
  const context = await getOrganizationContext();
  if (!context) redirect("/dashboard");
  if (!check(context.role)) redirect("/dashboard");
  return context;
}

export async function chooseOrganization(organizationId: string) {
  (await cookies()).set(activeOrgCookie, organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function requirePlatformAdmin() {
  const user = await requireUser();
  if (!user.isPlatformAdmin) redirect("/dashboard");
  return user;
}
