import { BookOpen, Check, ChevronRight, Star } from "lucide-react";
import { PapayaMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/i18n/dictionaries";

type Props = {
  copy: Dictionary["mockup"];
  className?: string;
};

/** Phone frame with a status bar. Content is decorative unless the caller labels it. */
export function PhoneFrame({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[2.75rem] bg-leaf p-2.5 shadow-[0_40px_80px_-30px_rgb(23_61_43/0.65)]", className)}>
      <div aria-hidden="true" className="relative overflow-hidden rounded-[2.2rem] bg-cream">
        <div className="flex items-center justify-between px-6 pt-3 text-[10px] font-bold text-leaf">
          <span>9:41</span>
          <span className="h-5 w-20 rounded-full bg-leaf" />
          <span className="flex gap-0.5">
            <span className="h-2.5 w-1 rounded-sm bg-leaf" />
            <span className="h-2.5 w-1 rounded-sm bg-leaf" />
            <span className="h-2.5 w-1 rounded-sm bg-leaf/40" />
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Row of loyalty stamps; filled ones show a check. */
export function StampRow({ filled, total, className }: { filled: number; total: number; className?: string }) {
  return (
    <span className={cn("grid grid-cols-5 gap-1.5", className)}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            "grid aspect-square place-items-center rounded-full",
            index < filled ? "bg-cream" : "border border-dashed border-cream/50",
          )}
        >
          {index < filled ? <Check className="size-[62%] text-leaf" strokeWidth={3.5} /> : null}
        </span>
      ))}
    </span>
  );
}

/** Venue page as guests see it after a tap or scan: menu, review and loyalty card. */
export function PhoneMockup({ copy, className }: Props) {
  return (
    <div role="img" aria-label={copy.label} className={className}>
      <PhoneFrame>
        <div className="px-4 pt-4 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-full bg-papaya font-heading text-sm font-extrabold">
              MK
            </span>
            <span className="min-w-0">
              <span className="block font-heading text-[15px] leading-tight font-bold">{copy.venue}</span>
              <span className="block text-[11px] text-muted-foreground">{copy.greeting}</span>
            </span>
          </div>

          <span className="mt-4 flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-sm">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-peach text-papaya-ink">
              <BookOpen className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-bold">{copy.menu}</span>
              <span className="block truncate text-[10px] text-muted-foreground">{copy.menuSub}</span>
            </span>
            <ChevronRight className="size-4 text-leaf/50" />
          </span>

          <span className="mt-2 flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-sm">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime text-leaf">
              <Star className="size-5 fill-current" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-bold">{copy.review}</span>
              <span className="mt-0.5 flex gap-0.5 text-papaya">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star key={index} className="size-2.5 fill-current" />
                ))}
              </span>
            </span>
            <ChevronRight className="size-4 text-leaf/50" />
          </span>

          <span className="mt-2 block rounded-2xl bg-leaf p-3 text-cream">
            <span className="flex items-center justify-between">
              <span className="text-[12px] font-bold">{copy.loyalty}</span>
              <PapayaMark className="size-5" />
            </span>
            <StampRow filled={7} total={10} className="mt-2.5" />
            <span className="mt-2 block text-[10px] text-cream/80">{copy.loyaltySub}</span>
          </span>
        </div>
      </PhoneFrame>
    </div>
  );
}
