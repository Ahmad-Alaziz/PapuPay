import Image from "next/image";
import { Container, Eyebrow } from "@/components/section";
import { Reveal } from "@/components/motion/reveal";
import { DemoDialog } from "@/components/demo/demo-dialog";
import { sectionIds } from "@/lib/site";
import papaya from "@/assets/papaya-illustration.png";
import type { Dictionary } from "@/i18n/dictionaries";

/**
 * Demo section. Self-contained so the "coming soon" dialog can later be
 * swapped for the real interactive demo without touching the rest of the page.
 */
export function DemoSection({ demo }: { demo: Dictionary["demo"] }) {
  return (
    <section id={sectionIds.demo} aria-labelledby="demo-title" className="py-10 sm:py-16">
      <Container>
        <Reveal className="relative overflow-hidden rounded-[2.5rem] bg-leaf px-6 py-14 text-cream sm:px-12 sm:py-20">
          <div aria-hidden="true" className="absolute -top-24 -right-24 size-80 rounded-full bg-leaf-soft" />
          <div aria-hidden="true" className="absolute -bottom-32 left-1/3 size-72 rounded-full bg-leaf-soft/60" />

          <div className="relative grid items-center gap-10 md:grid-cols-[1fr_auto]">
            <div className="max-w-xl">
              <Eyebrow tone="cream">{demo.eyebrow}</Eyebrow>
              <h2 id="demo-title" className="mt-5 text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl">
                {demo.title}
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-cream/85">{demo.body}</p>
              <div className="mt-9">
                <DemoDialog copy={demo} />
              </div>
            </div>
            <div className="relative mx-auto w-48 sm:w-64 md:w-72">
              <div aria-hidden="true" className="absolute inset-4 rounded-full bg-papaya/30 blur-2xl" />
              <Image
                src={papaya}
                alt=""
                sizes="(min-width: 768px) 18rem, 12rem"
                className="relative h-auto w-full -rotate-6 animate-float"
              />
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
