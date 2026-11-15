import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Section, SectionHeading } from "@/components/section";
import { Reveal } from "@/components/motion/reveal";
import { sectionIds } from "@/lib/site";
import type { Dictionary } from "@/i18n/dictionaries";

export function Faq({ faq }: { faq: Dictionary["faq"] }) {
  return (
    <Section id={sectionIds.faq} aria-labelledby="faq-title">
      <div className="grid gap-10 lg:grid-cols-12">
        <SectionHeading id="faq-title" eyebrow={faq.eyebrow} title={faq.title} className="lg:col-span-5" />
        <Reveal className="lg:col-span-7" delay={0.1}>
          <Accordion type="single" collapsible className="gap-3">
            {faq.items.map((item, index) => (
              <AccordionItem
                key={item.q}
                value={`item-${index}`}
                className="rounded-3xl border-0 bg-white px-6 transition-colors data-[state=open]:bg-peach"
              >
                <AccordionTrigger className="py-5 font-heading text-lg font-semibold text-leaf hover:no-underline focus-visible:ring-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-leaf **:data-[slot=accordion-trigger-icon]:size-5 **:data-[slot=accordion-trigger-icon]:text-leaf">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-base leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </Section>
  );
}
