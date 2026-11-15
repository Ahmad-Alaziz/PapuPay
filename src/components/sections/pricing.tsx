import { ArrowRight, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/section";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { pricingTiers } from "@/content/pricing";
import { sectionIds } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

type Props = {
  locale: Locale;
  pricing: Dictionary["pricing"];
};

export function Pricing({ locale, pricing }: Props) {
  return (
    <Section id={sectionIds.pricing} aria-labelledby="pricing-title">
      <SectionHeading
        id="pricing-title"
        eyebrow={pricing.eyebrow}
        title={pricing.title}
        intro={pricing.intro}
        align="center"
      />
      <Stagger className="mt-14 grid items-stretch gap-5 lg:grid-cols-3">
        {pricingTiers.map((tier) => {
          const askUs = tier.price === null;
          return (
            <StaggerItem
              key={tier.id}
              className={cn(
                "relative flex flex-col rounded-[2rem] p-7 sm:p-8",
                tier.featured && "bg-papaya text-leaf shadow-[0_30px_60px_-30px_rgb(180_70_14/0.7)] lg:-my-3 lg:py-11",
                askUs && "border-2 border-dashed border-leaf/30 bg-transparent",
                !tier.featured && !askUs && "bg-white",
              )}
            >
              {tier.featured ? (
                <p className="absolute -top-3 left-7 -rotate-2 rounded-md bg-leaf px-2.5 py-1 font-mono text-xs font-semibold tracking-wide text-cream uppercase">
                  {pricing.featured}
                </p>
              ) : null}

              <h3 className="flex items-center gap-2 text-2xl font-bold">
                {askUs ? <MessageCircle className="size-6 text-papaya-ink" aria-hidden="true" /> : null}
                {tier.name[locale]}
              </h3>
              <p className={cn("mt-3 leading-relaxed", !tier.featured && "text-muted-foreground")}>
                {tier.description[locale]}
              </p>

              {tier.price ? (
                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className="font-heading text-5xl font-extrabold tracking-tight">{tier.price.amount}</span>
                  <span className="font-semibold">{tier.price.currency}</span>
                  <span className={cn("text-sm", !tier.featured && "text-muted-foreground")}>
                    {tier.price.period[locale]}
                  </span>
                </p>
              ) : null}

              <ul className="mt-7 mb-8 space-y-3">
                {tier.features[locale].map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                        tier.featured ? "bg-leaf text-cream" : "bg-lime text-leaf",
                      )}
                    >
                      <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                size="lg"
                variant={tier.featured ? "leaf" : askUs ? "default" : "outline"}
                className="mt-auto w-full"
              >
                <a href={tier.cta.href}>
                  {tier.cta.label[locale]}
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </a>
              </Button>
            </StaggerItem>
          );
        })}
      </Stagger>
    </Section>
  );
}
