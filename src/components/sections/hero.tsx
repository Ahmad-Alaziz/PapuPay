import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Eyebrow } from "@/components/section";
import { HeroVisual } from "@/components/illustrations/hero-visual";
import { sectionIds } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/i18n/dictionaries";

type Props = {
  hero: Dictionary["hero"];
  mockup: Dictionary["mockup"];
};

const lineColors = ["text-leaf", "text-papaya-ink", "text-leaf"];

export function Hero({ hero, mockup }: Props) {
  return (
    <section aria-labelledby="hero-title" className="relative pt-8 pb-12 sm:pt-14 sm:pb-16">
      <Container className="grid items-center gap-14 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <Eyebrow className="animate-fade-up">{hero.eyebrow}</Eyebrow>
          <h1
            id="hero-title"
            className="mt-6 text-[3.2rem] leading-[0.95] font-extrabold tracking-[-0.035em] sm:text-7xl lg:text-[5.5rem]"
          >
            {hero.title.map((line, index) => (
              <span
                key={line}
                className={cn("block animate-rise", lineColors[index % lineColors.length])}
                style={{ animationDelay: `${80 + index * 90}ms` }}
              >
                {line}
              </span>
            ))}
          </h1>
          <p
            className="mt-7 max-w-xl animate-fade-up text-lg leading-relaxed text-muted-foreground sm:text-xl"
            style={{ animationDelay: "380ms" }}
          >
            {hero.subtitle}
          </p>
          <div className="mt-9 flex animate-fade-up flex-col gap-3 sm:flex-row" style={{ animationDelay: "460ms" }}>
            <Button asChild size="xl">
              <a href={`#${sectionIds.contact}`}>
                {hero.primaryCta}
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </a>
            </Button>
            <Button asChild size="xl" variant="outline">
              <a href={`#${sectionIds.how}`}>{hero.secondaryCta}</a>
            </Button>
          </div>
          <ul
            className="mt-9 flex animate-fade-up flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-leaf"
            style={{ animationDelay: "540ms" }}
          >
            {hero.highlights.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-lime">
                  <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-5">
          <HeroVisual copy={mockup} />
        </div>
      </Container>
    </section>
  );
}
