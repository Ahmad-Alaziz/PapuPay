"use server";

import { redirect } from "next/navigation";
import { audit } from "@/merchant/audit";
import {
  canEditSettings,
  canManageMember,
  chooseOrganization,
  invitableRoles,
  requireOrganization,
} from "@/merchant/auth/organization";
import { requireUser } from "@/merchant/auth/session";
import { db } from "@/merchant/db";
import { idSchema, roleSchema } from "@/merchant/validation";

/** Loads a member of the current organisation that the signed-in user may manage. */
async function manageableMember(membershipId: FormDataEntryValue | null) {
  const context = await requireOrganization(canEditSettings);
  const id = idSchema.safeParse(membershipId);
  if (!id.success) redirect("/dashboard/team?error=invalid");
  const member = await db.membership.findFirst({
    where: { id: id.data, organizationId: context.organization.id },
    select: { id: true, role: true, userId: true, user: { select: { email: true } } },
  });
  if (!member) redirect("/dashboard/team?error=invalid");
  if (member.userId === context.user.id) redirect("/dashboard/team?error=self");
  if (!canManageMember(context.role, member.role)) redirect("/dashboard/team?error=forbidden");
  return { context, member };
}

/** An organisation always keeps at least one owner. */
async function isLastOwner(organizationId: string, role: string) {
  if (role !== "OWNER") return false;
  return (await db.membership.count({ where: { organizationId, role: "OWNER" } })) <= 1;
}

export async function changeMemberRole(formData: FormData) {
  const { context, member } = await manageableMember(formData.get("membershipId"));
  const role = roleSchema.safeParse(formData.get("role"));
  if (!role.success || !invitableRoles(context.role).includes(role.data)) {
    redirect("/dashboard/team?error=forbidden");
  }
  if (role.data === member.role) redirect("/dashboard/team");
  if (await isLastOwner(context.organization.id, member.role)) redirect("/dashboard/team?error=last-owner");

  await db.$transaction(async (tx) => {
    await tx.membership.update({ where: { id: member.id }, data: { role: role.data } });
    await audit(
      {
        action: "member.role_changed",
        actorId: context.user.id,
        organizationId: context.organization.id,
        targetType: "membership",
        targetId: member.id,
        metadata: { email: member.user.email, from: member.role, to: role.data },
      },
      tx,
    );
  });
  redirect("/dashboard/team?notice=role-changed");
}

export async function removeMember(formData: FormData) {
  const { context, member } = await manageableMember(formData.get("membershipId"));
  if (await isLastOwner(context.organization.id, member.role)) redirect("/dashboard/team?error=last-owner");

  await db.$transaction(async (tx) => {
    await tx.membership.delete({ where: { id: member.id } });
    await audit(
      {
        action: "member.removed",
        actorId: context.user.id,
        organizationId: context.organization.id,
        targetType: "membership",
        targetId: member.id,
        metadata: { email: member.user.email, role: member.role },
      },
      tx,
    );
  });
  redirect("/dashboard/team?notice=removed");
}

/** Switches the organisation shown in the dashboard. */
export async function switchOrganization(formData: FormData) {
  const user = await requireUser();
  const id = idSchema.safeParse(formData.get("organizationId"));
  if (!id.success) redirect("/dashboard");
  const member = user.memberships.some((m) => m.organization.id === id.data);
  const exists = member || (user.isPlatformAdmin && (await db.organization.count({ where: { id: id.data } })) === 1);
  if (exists) await chooseOrganization(id.data);
  redirect("/dashboard");
}
