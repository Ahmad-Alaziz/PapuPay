import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/merchant/db";
import { days, hashToken, isWellFormedToken, newToken } from "./tokens";

const production = process.env.NODE_ENV === "production";
// __Host- cookies must be Secure, path=/ and host-only, so a subdomain can't set or read them.
const sessionCookie = production ? "__Host-papupay_session" : "papupay_session";
const sessionLifetime = days(30);

export async function startSession(userId: string) {
  const { token, hash } = newToken();
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  const expiresAt = new Date(Date.now() + sessionLifetime);
  await db.session.create({ data: { userId, tokenHash: hash, expiresAt, userAgent } });
  (await cookies()).set(sessionCookie, token, {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(sessionCookie)?.value;
  if (isWellFormedToken(token)) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete({ name: sessionCookie, path: "/", secure: production, httpOnly: true, sameSite: "lax" });
}

/**
 * The signed-in user with their organisations, or null. Reads the request's
 * cookies, so call it inside a Suspense boundary or a server action.
 */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!isWellFormedToken(token)) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          locale: true,
          isPlatformAdmin: true,
          memberships: {
            select: { role: true, organization: { select: { id: true, name: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  return session.user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/dashboard/login");
  return user;
}
