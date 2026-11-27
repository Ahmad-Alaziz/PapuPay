import { Suspense } from "react";
import Link from "next/link";
import { AuthFrame, AuthFrameFallback } from "@/components/dashboard/auth-frame";
import { Notice } from "@/components/dashboard/form";
import { Button } from "@/components/ui/button";
import { completeSignIn } from "@/merchant/actions/auth";
import { isWellFormedToken } from "@/merchant/auth/tokens";
import { getDashboardDictionary } from "@/merchant/i18n";

export const metadata = { referrer: "no-referrer" as const };

// Opening the emailed link only shows this button. Signing in is a POST, so
// mail scanners that open links ahead of the person can't use up the token.
export default function VerifyPage({ searchParams }: PageProps<"/dashboard/login/verify">) {
  return (
    <Suspense fallback={<AuthFrameFallback />}>
      <Verify searchParams={searchParams} />
    </Suspense>
  );
}

async function Verify({ searchParams }: Pick<PageProps<"/dashboard/login/verify">, "searchParams">) {
  const [{ locale, t }, { token }] = await Promise.all([getDashboardDictionary(), searchParams]);

  return (
    <AuthFrame locale={locale} languageLabel={t.shell.languageLabel}>
      <h1 className="font-heading text-3xl font-extrabold tracking-[-0.03em]">{t.login.verifyTitle}</h1>
      {isWellFormedToken(token) ? (
        <>
          <p className="mt-3 leading-relaxed text-muted-foreground">{t.login.verifyBody}</p>
          <form action={completeSignIn} className="mt-7">
            <input type="hidden" name="token" value={token} />
            <Button type="submit" size="lg" className="w-full">
              {t.login.verifySubmit}
            </Button>
          </form>
        </>
      ) : (
        <div className="mt-6 grid gap-5">
          <Notice tone="error">{t.login.errors.expired}</Notice>
          <Link href="/dashboard/login" className="text-sm font-semibold text-leaf underline underline-offset-4">
            {t.login.title}
          </Link>
        </div>
      )}
    </AuthFrame>
  );
}
