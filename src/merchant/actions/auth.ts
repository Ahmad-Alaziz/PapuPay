"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createRateLimiter } from "@/lib/rate-limit";
import { audit } from "@/merchant/audit";
import { appOrigin } from "@/merchant/auth/origin";
import { endSession, getCurrentUser, startSession } from "@/merchant/auth/session";
import { hashToken, isWellFormedToken, minutes, newToken } from "@/merchant/auth/tokens";
import { db } from "@/merchant/db";
import { sendLoginEmail } from "@/merchant/email";
import { emailSchema } from "@/merchant/validation";

const linkLifetime = minutes(15);
const perAddress = { limit: 3, windowMs: minutes(15) };
// Per server instance; the per-address limit below is enforced in the database.
const perClient = createRateLimiter({ limit: 10, windowMs: minutes(15) });

async function clientKey() {
  const list = await headers();
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "unknown";
}

/**
 * Emails a sign-in link to anyone with dashboard access. The response is the
 * same whether or not the address has an account, so it can't be used to find out.
 */
export async function requestSignInLink(formData: FormData) {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) redirect("/dashboard/login?error=email");
  if (!perClient(await clientKey()).allowed) redirect("/dashboard/login?error=rate");

  const user = await db.user.findUnique({
    where: { email: parsed.data },
    select: { id: true, locale: true, isPlatformAdmin: true, _count: { select: { memberships: true } } },
  });

  if (user && (user.isPlatformAdmin || user._count.memberships > 0)) {
    const recent = await db.loginToken.count({
      where: { userId: user.id, createdAt: { gt: new Date(Date.now() - perAddress.windowMs) } },
    });
    if (recent < perAddress.limit) {
      const { token, hash } = newToken();
      await db.loginToken.create({
        data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + linkLifetime) },
      });
      let failed = false;
      try {
        await sendLoginEmail(parsed.data, user.locale, `${appOrigin()}/dashboard/login/verify?token=${token}`);
      } catch (error) {
        console.error("Sign-in email failed", error instanceof Error ? error.message : error);
        failed = true;
      }
      if (failed) redirect("/dashboard/login?error=send");
    }
  }
  redirect("/dashboard/login?sent=1");
}

/**
 * Uses a sign-in link. Opening the link only shows a button; signing in takes
 * this POST, so email scanners that prefetch links can't use up the token.
 */
export async function completeSignIn(formData: FormData) {
  const token = formData.get("token");
  if (!isWellFormedToken(token)) redirect("/dashboard/login?error=expired");
  const tokenHash = hashToken(token);

  const { count } = await db.loginToken.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (count !== 1) redirect("/dashboard/login?error=expired");

  const { userId } = await db.loginToken.findUniqueOrThrow({ where: { tokenHash }, select: { userId: true } });
  await startSession(userId);
  await audit({ action: "session.started", actorId: userId, targetType: "user", targetId: userId });
  redirect("/dashboard");
}

export async function signOut() {
  const user = await getCurrentUser();
  await endSession();
  if (user) await audit({ action: "session.ended", actorId: user.id, targetType: "user", targetId: user.id });
  redirect("/dashboard/login");
}
