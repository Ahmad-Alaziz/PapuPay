import { Check } from "lucide-react";
import { Container, Eyebrow } from "@/components/section";
import { Reveal } from "@/components/motion/reveal";
import { ContactForm } from "@/components/contact/contact-form";
import { sectionIds } from "@/lib/site";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

type Props = {
  locale: Locale;
  contact: Dictionary["contact"];
};

export function Contact({ locale, contact }: Props) {
  return (
    <section id={sectionIds.contact} aria-labelledby="contact-title" className="py-16 sm:py-24">
      <Container>
        <Reveal className="relative overflow-hidden rounded-[2.5rem] bg-papaya p-3 sm:p-4">
          <div aria-hidden="true" className="absolute -top-24 -left-24 size-80 rounded-full bg-[#ff8d52]" />
          <div aria-hidden="true" className="absolute -bottom-20 -left-12 size-56 rounded-full bg-[#ffb347]" />

          <div className="relative grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col p-6 text-leaf sm:p-10">
              <Eyebrow className="self-start">{contact.eyebrow}</Eyebrow>
              <h2
                id="contact-title"
                className="mt-6 text-5xl leading-[0.98] font-extrabold tracking-[-0.03em] sm:text-6xl"
              >
                {contact.title}
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed font-medium">{contact.body}</p>
              <ul className="mt-8 space-y-3">
                {contact.points.map((point) => (
                  <li key={point} className="flex items-center gap-3 font-semibold">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-leaf text-cream">
                      <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[2rem] bg-cream p-6 sm:p-10">
              <ContactForm copy={contact.form} locale={locale} />
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
