import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import { AuthFrame, AuthFrameFallback } from "@/components/dashboard/auth-frame";
import { Field, Notice, pickMessage } from "@/components/dashboard/form";
import { Button } from "@/components/ui/button";
import { requestSignInLink } from "@/merchant/actions/auth";
import { getCurrentUser } from "@/merchant/auth/session";
import { getDashboardDictionary } from "@/merchant/i18n";

export default function LoginPage({ searchParams }: PageProps<"/dashboard/login">) {
  return (
    <Suspense fallback={<AuthFrameFallback />}>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

async function Login({ searchParams }: Pick<PageProps<"/dashboard/login">, "searchParams">) {
  if (await getCurrentUser()) redirect("/dashboard");
  const [{ locale, t }, query] = await Promise.all([getDashboardDictionary(), searchParams]);
  const error = pickMessage(t.login.errors, query.error);

  return (
    <AuthFrame locale={locale} languageLabel={t.shell.languageLabel}>
      {query.sent ? (
        <div role="status">
          <MailCheck aria-hidden="true" className="size-10 text-papaya-ink" />
          <h1 className="mt-5 font-heading text-3xl font-extrabold tracking-[-0.03em]">{t.login.sentTitle}</h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">{t.login.sentBody}</p>
          <Link
            href="/dashboard/login"
            className="mt-6 inline-block text-sm font-semibold text-leaf underline underline-offset-4"
          >
            {t.login.tryAgain}
          </Link>
        </div>
      ) : (
        <>
          <h1 className="font-heading text-3xl font-extrabold tracking-[-0.03em]">{t.login.title}</h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">{t.login.body}</p>
          {error ? (
            <div className="mt-6">
              <Notice tone="error">{error}</Notice>
            </div>
          ) : null}
          <form action={requestSignInLink} className="mt-7 grid gap-5">
            <Field
              id="email"
              name="email"
              type="email"
              label={t.login.emailLabel}
              autoComplete="email"
              inputMode="email"
              required
              autoFocus
            />
            <Button type="submit" size="lg" className="w-full">
              {t.login.submit}
            </Button>
          </form>
        </>
      )}
    </AuthFrame>
  );
}
