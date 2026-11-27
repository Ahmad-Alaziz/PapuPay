import "server-only";
import type { Locale, Role } from "@/generated/prisma/enums";
import { audit } from "./audit";
import { appOrigin } from "./auth/origin";
import { days, hashToken, newToken } from "./auth/tokens";
import { db } from "./db";
import { sendInvitationEmail } from "./email";

// Not a server action: callers check permissions first.

const invitationLifetime = days(7);

/**
 * Replaces any pending invitation for the same address, stores a new one and
 * emails it. Shared by the team page and the platform admin page.
 */
export async function issueInvitation({
  organizationId,
  organizationName,
  email,
  role,
  locale,
  invitedById,
}: {
  organizationId: string;
  organizationName: string;
  email: string;
  role: Role;
  locale: Locale;
  invitedById: string;
}) {
  const { token, hash } = newToken();
  const invitation = await db.$transaction(async (tx) => {
    await tx.invitation.updateMany({
      where: { organizationId, email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const created = await tx.invitation.create({
      data: {
        organizationId,
        email,
        role,
        locale,
        invitedById,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + invitationLifetime),
      },
    });
    await audit(
      {
        action: "invitation.created",
        actorId: invitedById,
        organizationId,
        targetType: "invitation",
        targetId: created.id,
        metadata: { email, role },
      },
      tx,
    );
    return created;
  });
  await sendInvitationEmail(email, locale, `${appOrigin()}/dashboard/invite/${token}`, organizationName, role);
  return invitation;
}


/** The invitation behind an emailed link, if it can still be accepted. */
export function findUsableInvitation(token: string) {
  return db.invitation.findFirst({
    where: { tokenHash: hashToken(token), acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { email: true, role: true, organization: { select: { name: true } } },
  });
}
