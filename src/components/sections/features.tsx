import { BookOpen, Check, Stamp, Star, type LucideIcon } from "lucide-react";
import { Section, SectionHeading } from "@/components/section";
import { Reveal } from "@/components/motion/reveal";
import { LoyaltyMockup, MenuEditorMockup, ReviewMockup } from "@/components/illustrations/feature-mockups";
import { sectionIds } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/i18n/dictionaries";

type FeatureCopy = {
  tag: string;
  title: string;
  body: string;
  points: string[];
};

type RowProps = {
  feature: FeatureCopy;
  Icon: LucideIcon;
  panel: string;
  reverse?: boolean;
  badge?: string;
  children: React.ReactNode;
};

function FeatureRow({ feature, Icon, panel, reverse, badge, children }: RowProps) {
  return (
    <li className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <Reveal className={cn(reverse && "lg:order-last")}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex -rotate-2 items-center gap-1.5 rounded-md bg-leaf px-2.5 py-1 font-mono text-xs font-semibold tracking-wide text-cream uppercase">
            <Icon className="size-3.5 text-lime" aria-hidden="true" />
            {feature.tag}
          </span>
          {badge ? (
            <span className="rounded-full border border-papaya-ink/40 px-2.5 py-0.5 text-xs font-bold text-papaya-ink">
              {badge}
            </span>
          ) : null}
        </div>
        <h3 className="mt-5 text-3xl leading-tight font-bold sm:text-4xl">{feature.title}</h3>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{feature.body}</p>
        <ul className="mt-6 space-y-3">
          {feature.points.map((point) => (
            <li key={point} className="flex gap-3 font-semibold">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-lime text-leaf">
                <Check className="size-3" strokeWidth={3} aria-hidden="true" />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal delay={0.1} className={cn("relative overflow-hidden rounded-[2rem] px-5 py-10 sm:px-10 sm:py-12", panel)}>
        {children}
      </Reveal>
    </li>
  );
}

export function Features({ features }: { features: Dictionary["features"] }) {
  return (
    <Section id={sectionIds.features} aria-labelledby="features-title">
      <SectionHeading
        id="features-title"
        eyebrow={features.eyebrow}
        title={features.title}
        intro={features.intro}
        align="center"
      />
      <ul className="mt-16 space-y-20 sm:space-y-24">
        <FeatureRow feature={features.menu} Icon={BookOpen} panel="bg-peach">
          <MenuEditorMockup copy={features.menu.mock} />
        </FeatureRow>
        <FeatureRow feature={features.reviews} Icon={Star} panel="bg-lime" reverse>
          <ReviewMockup copy={features.reviews.mock} />
        </FeatureRow>
        <FeatureRow feature={features.loyalty} Icon={Stamp} panel="bg-papaya" badge={features.earlyAccess}>
          <LoyaltyMockup copy={features.loyalty.mock} />
        </FeatureRow>
      </ul>
    </Section>
  );
}
