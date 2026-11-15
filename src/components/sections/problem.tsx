import {
  BookOpen,
  Clock,
  Layers,
  MessageSquareHeart,
  Printer,
  Stamp,
  Star,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { Section, SectionHeading } from "@/components/section";
import { Reveal } from "@/components/motion/reveal";
import { sectionIds } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/i18n/dictionaries";

const guestIcons = [BookOpen, Stamp, Star, Layers];
const ownerIcons = [Printer, MessageSquareHeart, UserX, Clock];

type LossCardProps = {
  title: string;
  items: string[];
  icons: LucideIcon[];
  variant: "guests" | "owners";
};

function LossCard({ title, items, icons, variant }: LossCardProps) {
  const owners = variant === "owners";
  return (
    <div
      className={cn(
        "h-full rounded-[2rem] p-7 sm:p-9",
        owners ? "bg-leaf text-cream" : "bg-lime text-leaf",
      )}
    >
      <h3 className="text-2xl font-bold sm:text-3xl">{title}</h3>
      <ul className="mt-7 space-y-5">
        {items.map((item, index) => {
          const Icon = icons[index % icons.length];
          return (
            <li key={item} className="flex gap-4">
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-2xl",
                  owners ? "bg-cream/10 text-lime" : "bg-leaf text-lime",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className={cn("pt-2 leading-relaxed", owners ? "text-cream/90" : "text-leaf/90")}>{item}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Problem({ problem }: { problem: Dictionary["problem"] }) {
  return (
    <Section id={sectionIds.problem} aria-labelledby="problem-title">
      <SectionHeading id="problem-title" eyebrow={problem.eyebrow} title={problem.title} intro={problem.intro} />
      <div className="mt-12 grid gap-4 md:grid-cols-2 md:gap-5">
        <Reveal className="h-full">
          <LossCard title={problem.owners.title} items={problem.owners.items} icons={ownerIcons} variant="owners" />
        </Reveal>
        <Reveal className="h-full" delay={0.12}>
          <LossCard title={problem.guests.title} items={problem.guests.items} icons={guestIcons} variant="guests" />
        </Reveal>
      </div>
    </Section>
  );
}
