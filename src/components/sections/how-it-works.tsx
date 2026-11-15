import { Section, SectionHeading } from "@/components/section";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import {
  RewardIllustration,
  SetupIllustration,
  StickerIllustration,
  TapIllustration,
} from "@/components/illustrations/steps/step-illustrations";
import { sectionIds } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/i18n/dictionaries";

const steps = [
  { Illustration: SetupIllustration, card: "bg-papaya text-leaf", panel: "bg-white/25", badge: "bg-leaf text-cream" },
  { Illustration: StickerIllustration, card: "bg-white text-leaf", panel: "bg-peach", badge: "bg-papaya text-leaf" },
  { Illustration: TapIllustration, card: "bg-lime text-leaf", panel: "bg-white/45", badge: "bg-leaf text-cream" },
  { Illustration: RewardIllustration, card: "bg-leaf text-cream", panel: "bg-white/10", badge: "bg-lime text-leaf" },
];

export function HowItWorks({ how }: { how: Dictionary["how"] }) {
  return (
    <Section id={sectionIds.how} aria-labelledby="how-title">
      <SectionHeading id="how-title" eyebrow={how.eyebrow} title={how.title} intro={how.intro} />
      <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {how.steps.map((step, index) => {
          const { Illustration, card, panel, badge } = steps[index % steps.length];
          return (
            <StaggerItem
              key={step.title}
              className={cn(
                "group relative flex flex-col rounded-[2rem] p-4 pb-7 transition-transform duration-300 hover:-translate-y-1",
                card,
              )}
            >
              <Illustration className={panel} />
              <div className="mt-6 flex items-center gap-3 px-3">
                <span
                  className={cn("grid size-9 shrink-0 place-items-center rounded-xl font-heading text-sm font-extrabold", badge)}
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-2xl font-bold">
                  <span className="sr-only">{index + 1}. </span>
                  {step.title}
                </h3>
              </div>
              <p className="mt-3 px-3 leading-relaxed">{step.body}</p>
            </StaggerItem>
          );
        })}
      </Stagger>
    </Section>
  );
}
