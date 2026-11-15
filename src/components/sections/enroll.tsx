import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/section";
import { Reveal } from "@/components/motion/reveal";
import { sectionIds } from "@/lib/site";
import type { Dictionary } from "@/i18n/dictionaries";

/** Call to action between the features and the benefits; jumps to the contact form. */
export function Enroll({ enroll }: { enroll: Dictionary["enroll"] }) {
  return (
    <section aria-labelledby="enroll-title" className="py-8 sm:py-12">
      <Container>
        <Reveal className="relative overflow-hidden rounded-[2.5rem] bg-leaf px-6 py-12 text-center text-cream sm:px-12 sm:py-16">
          <div aria-hidden="true" className="absolute -top-20 -right-16 size-64 rounded-full bg-leaf-soft" />
          <div aria-hidden="true" className="absolute -bottom-24 -left-14 size-56 rounded-full bg-papaya/25" />
          <div className="relative mx-auto max-w-2xl">
            <h2
              id="enroll-title"
              className="text-4xl leading-[1.02] font-extrabold tracking-[-0.03em] text-balance sm:text-6xl"
            >
              {enroll.title}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-cream/85">{enroll.body}</p>
            <Button asChild size="xl" className="mt-9 shadow-[0_6px_0_-2px_var(--lime)] hover:shadow-[0_8px_0_-2px_var(--lime)]">
              <a href={`#${sectionIds.contact}`}>
                {enroll.cta}
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
