import { Suspense } from "react";
import { DashboardFrame, DashboardFrameFallback } from "@/components/dashboard/dashboard-frame";
import { getDashboardDictionary } from "@/merchant/i18n";

export default function DashboardHome() {
  return (
    <Suspense fallback={<DashboardFrameFallback />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const { locale, t } = await getDashboardDictionary();
  const { home } = t;

  return (
    <DashboardFrame locale={locale} t={t} current="overview">
      <p className="text-sm font-bold tracking-[0.14em] text-papaya-ink uppercase">{home.eyebrow}</p>
      <h1 className="mt-3 font-heading text-4xl leading-[1.05] font-extrabold tracking-[-0.03em] text-balance sm:text-5xl">
        {home.title}
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{home.body}</p>

      <section aria-labelledby="progress-title" className="mt-12 rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <h2 id="progress-title" className="font-heading text-2xl font-bold tracking-[-0.02em]">
          {home.progressTitle}
        </h2>
        <p className="mt-2 text-muted-foreground">{home.progressBody}</p>
        <ol className="mt-7 grid gap-4 sm:grid-cols-2">
          {home.steps.map((step, index) => (
            <li key={step.title} className="flex gap-4 rounded-2xl bg-muted/60 p-5">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-leaf font-heading text-sm font-bold text-cream"
              >
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </DashboardFrame>
  );
}
