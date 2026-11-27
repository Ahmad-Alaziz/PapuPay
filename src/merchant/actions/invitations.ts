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
import { startSession } from "@/merchant/auth/session";
import { hashToken, isWellFormedToken } from "@/merchant/auth/tokens";
import { db } from "@/merchant/db";
import { issueInvitation } from "@/merchant/invitations";
import { idSchema, invitationSchema } from "@/merchant/validation";

export async function inviteMember(formData: FormData) {
  const context = await requireOrganization(canEditSettings);
  const parsed = invitationSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    locale: formData.get("locale"),
  });
  if (!parsed.success) redirect("/dashboard/team?error=invalid");
  const { email, role, locale } = parsed.data;
  if (!invitableRoles(context.role).includes(role)) redirect("/dashboard/team?error=forbidden");

  const existing = await db.membership.findFirst({
    where: { organizationId: context.organization.id, user: { email } },
    select: { id: true },
  });
  if (existing) redirect("/dashboard/team?error=already-member");

  let failed = false;
  try {
    await issueInvitation({
      organizationId: context.organization.id,
      organizationName: context.organization.name,
      email,
      role,
      locale,
      invitedById: context.user.id,
    });
  } catch (error) {
    console.error("Invitation email failed", error instanceof Error ? error.message : error);
    failed = true;
  }
  redirect(failed ? "/dashboard/team?error=send" : "/dashboard/team?notice=invited");
}

export async function revokeInvitation(formData: FormData) {
  const context = await requireOrganization(canEditSettings);
  const id = idSchema.safeParse(formData.get("invitationId"));
  if (!id.success) redirect("/dashboard/team?error=invalid");

  const invitation = await db.invitation.findFirst({
    where: { id: id.data, organizationId: context.organization.id, acceptedAt: null, revokedAt: null },
    select: { id: true, role: true, email: true },
  });
  if (!invitation) redirect("/dashboard/team?error=invalid");
  if (!canManageMember(context.role, invitation.role)) redirect("/dashboard/team?error=forbidden");

  await db.$transaction([
    db.invitation.update({ where: { id: invitation.id }, data: { revokedAt: new Date() } }),
    db.auditLog.create({
      data: {
        action: "invitation.revoked",
        actorId: context.user.id,
        organizationId: context.organization.id,
        targetType: "invitation",
        targetId: invitation.id,
        metadata: { email: invitation.email },
      },
    }),
  ]);
  redirect("/dashboard/team?notice=revoked");
}

/**
 * Accepting proves the person controls the invited address, so it creates
 * their account if needed, adds the membership and signs them in.
 */
export async function acceptInvitation(formData: FormData) {
  const token = formData.get("token");
  if (!isWellFormedToken(token)) redirect("/dashboard/login?error=invite");

  const result = await db.$transaction(async (tx) => {
    const invitation = await tx.invitation.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!invitation || invitation.revokedAt || invitation.expiresAt.getTime() <= Date.now()) return null;

    // Guard against the link being used twice at the same moment.
    const claimed = await tx.invitation.updateMany({
      where: { id: invitation.id, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });
    if (claimed.count !== 1) return null;

    const user = await tx.user.upsert({
      where: { email: invitation.email },
      create: { email: invitation.email, locale: invitation.locale },
      update: {},
      select: { id: true },
    });
    // Someone who already belongs keeps their current role.
    await tx.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: invitation.organizationId } },
      create: { userId: user.id, organizationId: invitation.organizationId, role: invitation.role },
      update: {},
    });
    await audit(
      {
        action: "invitation.accepted",
        actorId: user.id,
        organizationId: invitation.organizationId,
        targetType: "invitation",
        targetId: invitation.id,
        metadata: { role: invitation.role },
      },
      tx,
    );
    return { userId: user.id, organizationId: invitation.organizationId };
  });

  if (!result) redirect("/dashboard/login?error=invite");
  await startSession(result.userId);
  await chooseOrganization(result.organizationId);
  redirect("/dashboard");
}
