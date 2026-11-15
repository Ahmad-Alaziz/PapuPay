import { BookOpen, Layers, Repeat, Stamp, Star, Wallet, type LucideIcon } from "lucide-react";
import { Container, Eyebrow } from "@/components/section";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { AreaChart, CountUp, FeatureToggles, ProgressRing, RisingBars } from "@/components/charts/charts";
import { PapayaMark } from "@/components/brand/logo";
import { benefitStats, type Stat } from "@/content/stats";
import { sectionIds } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/i18n/dictionaries";

const guestIcons = [BookOpen, Stamp, Wallet, Star];

type CardProps = {
  tag: string;
  Icon: LucideIcon;
  tone: "leaf" | "papaya" | "white" | "lime";
  className?: string;
  children: React.ReactNode;
};

const tones = {
  leaf: { card: "bg-leaf text-cream", chip: "bg-lime text-leaf", icon: "text-lime" },
  papaya: { card: "bg-papaya text-leaf", chip: "bg-leaf text-cream", icon: "text-leaf" },
  white: { card: "bg-white text-leaf", chip: "bg-leaf text-cream", icon: "text-papaya-ink" },
  lime: { card: "bg-lime text-leaf", chip: "bg-leaf text-cream", icon: "text-leaf" },
};

/** Bento card with a tilted tag chip and an icon, as in the style reference. */
function BentoCard({ tag, Icon, tone, className, children }: CardProps) {
  const style = tones[tone];
  return (
    <StaggerItem
      className={cn(
        "flex flex-col rounded-[1.75rem] p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-7",
        style.card,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("-rotate-2 rounded-md px-2 py-1 font-mono text-[11px] font-semibold tracking-wide uppercase", style.chip)}>
          {tag}
        </span>
        <Icon className={cn("size-5 shrink-0", style.icon)} aria-hidden="true" />
      </div>
      {children}
    </StaggerItem>
  );
}

function Metric({ stat, label, className }: { stat: Stat; label: string; className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <CountUp stat={stat} className="font-heading text-5xl leading-none font-extrabold tracking-tight" />
      <span className="text-sm font-semibold">
        {label}
        <span aria-hidden="true">*</span>
      </span>
    </p>
  );
}

export function Benefits({ benefits }: { benefits: Dictionary["benefits"] }) {
  const { owners, chart } = benefits;
  const chartLabels = { before: chart.before, after: chart.after };

  return (
    <section id={sectionIds.benefits} aria-labelledby="benefits-title" className="py-16 sm:py-24">
      <Container>
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-5">
          {/* Loyalty: tall card, left */}
          <BentoCard tag={owners.loyalty.tag} Icon={Repeat} tone="leaf" className="lg:col-span-3 lg:row-span-2">
            <h3 className="mt-6 text-2xl font-bold">{owners.loyalty.title}</h3>
            <Metric stat={benefitStats.loyalty} label={owners.loyalty.metric} className="mt-4 text-lime" />
            <div className="mt-6 flex flex-1 flex-col text-cream">
              <AreaChart
                series={benefitStats.loyalty.series}
                beforeCount={benefitStats.loyalty.beforeCount}
                labels={chartLabels}
              />
            </div>
            <p className="pt-6 leading-relaxed text-cream/85">{owners.loyalty.body}</p>
          </BentoCard>

          {/* Reviews: top middle */}
          <BentoCard tag={owners.reviews.tag} Icon={Star} tone="papaya" className="lg:col-span-3">
            <h3 className="mt-6 text-xl font-bold">{owners.reviews.title}</h3>
            <Metric stat={benefitStats.reviews} label={owners.reviews.metric} className="mt-3" />
            <div className="mt-5">
              <RisingBars
                bars={benefitStats.reviews.bars}
                beforeCount={benefitStats.reviews.beforeCount}
                labels={chartLabels}
              />
            </div>
            <p className="mt-4 text-sm leading-relaxed">{owners.reviews.body}</p>
          </BentoCard>

          {/* Menus: top middle */}
          <BentoCard tag={owners.menus.tag} Icon={BookOpen} tone="white" className="lg:col-span-3">
            <h3 className="mt-6 text-xl font-bold">{owners.menus.title}</h3>
            <div className="mt-4 flex flex-col gap-3">
              <ProgressRing stat={benefitStats.menus} />
              <p className="text-sm font-semibold">
                {owners.menus.metric}
                <span aria-hidden="true">*</span>
              </p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{owners.menus.body}</p>
          </BentoCard>

          {/* All in one: tall card, right */}
          <BentoCard tag={owners.allInOne.tag} Icon={Layers} tone="lime" className="sm:max-lg:order-last lg:col-span-3 lg:row-span-2">
            <h3 className="mt-6 text-2xl font-bold">{owners.allInOne.title}</h3>
            <div className="mt-6 flex flex-1 flex-col">
              <FeatureToggles features={owners.allInOne.features} />
            </div>
            <p className="pt-6 leading-relaxed">{owners.allInOne.body}</p>
          </BentoCard>

          {/* Centre headline, like the stacked headline in the style reference */}
          <StaggerItem className="flex flex-col items-center justify-center py-8 text-center max-lg:order-first sm:col-span-2 lg:col-span-6 lg:py-4">
            <Eyebrow>{benefits.eyebrow}</Eyebrow>
            <h2
              id="benefits-title"
              className="mt-5 bg-gradient-to-br from-papaya-ink via-[#c4500f] to-[#d96512] bg-clip-text text-5xl leading-[0.98] font-extrabold tracking-[-0.035em] text-transparent sm:text-6xl"
            >
              {benefits.title.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            <p className="mt-5 max-w-sm text-lg text-muted-foreground">{benefits.intro}</p>
            <PapayaMark className="mt-5 size-10 animate-bob" />
          </StaggerItem>
        </Stagger>

        {/* Guests: wide card */}
        <Reveal className="mt-4 rounded-[1.75rem] bg-peach p-6 sm:p-9 lg:mt-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-2xl font-bold">{benefits.guests.title}</h3>
            <span className="-rotate-2 self-start rounded-md bg-leaf px-2 py-1 font-mono text-[11px] font-semibold tracking-wide text-cream uppercase">
              {benefits.guests.tag}
            </span>
          </div>
          <ul className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.guests.items.map((item, index) => {
              const Icon = guestIcons[index % guestIcons.length];
              return (
                <li key={item.title}>
                  <span className="grid size-11 place-items-center rounded-full bg-white text-papaya-ink">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h4 className="mt-4 text-lg font-bold">{item.title}</h4>
                  <p className="mt-1 text-muted-foreground">{item.body}</p>
                </li>
              );
            })}
          </ul>
        </Reveal>

        <p className="mt-4 text-sm text-muted-foreground">{benefits.footnote}</p>
      </Container>
    </section>
  );
}
