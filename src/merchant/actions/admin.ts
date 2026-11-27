"use server";

import { redirect } from "next/navigation";
import { audit } from "@/merchant/audit";
import { requirePlatformAdmin } from "@/merchant/auth/organization";
import { db } from "@/merchant/db";
import { issueInvitation } from "@/merchant/invitations";
import { createOrganizationSchema } from "@/merchant/validation";

/**
 * PapuPay onboards each client: create the organisation and its first venue,
 * then email the owner an invitation.
 */
export async function createOrganization(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const parsed = createOrganizationSchema.safeParse({
    organizationName: formData.get("organizationName"),
    venueName: formData.get("venueName"),
    venueSlug: formData.get("venueSlug"),
    ownerEmail: formData.get("ownerEmail"),
    locale: formData.get("locale"),
  });
  if (!parsed.success) redirect("/dashboard/admin?error=invalid");
  const { organizationName, venueName, venueSlug, ownerEmail, locale } = parsed.data;

  if (await db.venue.findUnique({ where: { slug: venueSlug }, select: { id: true } })) {
    redirect("/dashboard/admin?error=slug-taken");
  }

  const organization = await db.$transaction(async (tx) => {
    const created = await tx.organization.create({ data: { name: organizationName } });
    const venue = await tx.venue.create({
      data: { organizationId: created.id, name: venueName, slug: venueSlug },
    });
    await audit(
      { action: "organization.created", actorId: admin.id, organizationId: created.id, targetType: "organization", targetId: created.id },
      tx,
    );
    await audit(
      {
        action: "venue.created",
        actorId: admin.id,
        organizationId: created.id,
        targetType: "venue",
        targetId: venue.id,
        metadata: { slug: venueSlug },
      },
      tx,
    );
    return created;
  });

  let failed = false;
  try {
    await issueInvitation({
      organizationId: organization.id,
      organizationName,
      email: ownerEmail,
      role: "OWNER",
      locale,
      invitedById: admin.id,
    });
  } catch (error) {
    console.error("Owner invitation failed", error instanceof Error ? error.message : error);
    failed = true;
  }
  redirect(failed ? "/dashboard/admin?error=send" : "/dashboard/admin?notice=created");
}
