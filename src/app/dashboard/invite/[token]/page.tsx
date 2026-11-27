import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { AuthFrame, AuthFrameFallback } from "@/components/dashboard/auth-frame";
import { Notice } from "@/components/dashboard/form";
import { Button } from "@/components/ui/button";
import { acceptInvitation } from "@/merchant/actions/invitations";
import { isWellFormedToken } from "@/merchant/auth/tokens";
import { getDashboardDictionary } from "@/merchant/i18n";
import { findUsableInvitation } from "@/merchant/invitations";

export const metadata = { referrer: "no-referrer" as const };

// Like sign-in links, opening an invitation only shows it; accepting is a POST.
export default function InvitePage({ params }: PageProps<"/dashboard/invite/[token]">) {
  return (
    <Suspense fallback={<AuthFrameFallback />}>
      <Invite params={params} />
    </Suspense>
  );
}

async function Invite({ params }: Pick<PageProps<"/dashboard/invite/[token]">, "params">) {
  // The expiry check compares against the current time, so render at request time.
  await connection();
  const [{ locale, t }, { token }] = await Promise.all([getDashboardDictionary(), params]);
  const invitation = isWellFormedToken(token) ? await findUsableInvitation(token) : null;

  return (
    <AuthFrame locale={locale} languageLabel={t.shell.languageLabel}>
      {invitation ? (
        <>
          <h1 className="font-heading text-3xl font-extrabold tracking-[-0.03em] text-balance">
            {t.invite.title(invitation.organization.name)}
          </h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {t.invite.body(invitation.email, t.roles[invitation.role].name.toLowerCase())}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.roles[invitation.role].body}</p>
          <form action={acceptInvitation} className="mt-7">
            <input type="hidden" name="token" value={token} />
            <Button type="submit" size="lg" className="w-full">
              {t.invite.accept}
            </Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="font-heading text-3xl font-extrabold tracking-[-0.03em]">{t.invite.invalidTitle}</h1>
          <div className="mt-6 grid gap-5">
            <Notice tone="error">{t.login.errors.invite}</Notice>
            <Link href="/dashboard/login" className="text-sm font-semibold text-leaf underline underline-offset-4">
              {t.login.title}
            </Link>
          </div>
        </>
      )}
    </AuthFrame>
  );
}
