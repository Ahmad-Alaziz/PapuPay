import { notFound } from "next/navigation";
import { Hero } from "@/components/sections/hero";
import { Problem } from "@/components/sections/problem";
import { Features } from "@/components/sections/features";
import { Enroll } from "@/components/sections/enroll";
import { Benefits } from "@/components/sections/benefits";
import { Pricing } from "@/components/sections/pricing";
import { Faq } from "@/components/sections/faq";
import { Contact } from "@/components/sections/contact";
import { PageBackground } from "@/components/illustrations/page-background";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <div className="relative isolate">
      <PageBackground />
      <Hero hero={dict.hero} mockup={dict.mockup} />
      <Problem problem={dict.problem} />
      <Features features={dict.features} />
      <Enroll enroll={dict.enroll} />
      <Benefits benefits={dict.benefits} />
      <Pricing locale={lang} pricing={dict.pricing} />
      <Faq faq={dict.faq} />
      <Contact locale={lang} contact={dict.contact} />
    </div>
  );
}
