"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { Check, Coffee, Nfc, Star } from "lucide-react";
import { PapayaMark } from "@/components/brand/logo";
import { PhoneFrame, StampRow } from "@/components/illustrations/phone-mockup";
import { usePhaseLoop } from "@/components/motion/use-phase-loop";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/i18n/dictionaries";

type Features = Dictionary["features"];

/* ---------------- Digital menu: edit a price in the dashboard ---------------- */

export function MenuEditorMockup({ copy }: { copy: Features["menu"]["mock"] }) {
  // 0: idle · 1: editing · 2: saved and live
  const { ref, phase } = usePhaseLoop<HTMLDivElement>([1400, 1600, 2600]);
  const editIndex = 0;
  const saved = phase === 2;

  return (
    <div ref={ref} aria-hidden="true" className="flex items-end gap-4">
      <div className="min-w-0 flex-1 overflow-hidden rounded-2xl bg-white shadow-[0_30px_60px_-30px_rgb(23_61_43/0.5)]">
        <div className="flex items-center gap-1.5 border-b bg-cream px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-papaya" />
          <span className="size-2.5 rounded-full bg-lime" />
          <span className="size-2.5 rounded-full bg-leaf/30" />
          <span className="ml-3 text-xs font-bold text-leaf">{copy.window}</span>
        </div>
        <div className="p-4 sm:p-5">
          <p className="font-heading text-sm font-bold text-leaf">{copy.section}</p>
          <ul className="mt-3 space-y-2">
            {copy.items.map((item, index) => {
              const editing = index === editIndex && phase === 1;
              const price = index === editIndex && phase >= 1 ? copy.editing : item.price;
              return (
                <li key={item.name} className="flex items-center gap-3 rounded-xl bg-cream/70 px-3 py-2.5">
                  <span className="size-8 shrink-0 rounded-lg bg-peach" />
                  <span className="flex-1 text-sm font-semibold text-leaf">{item.name}</span>
                  <span
                    className={cn(
                      "flex min-w-20 items-center justify-end gap-1 rounded-lg border bg-white px-2 py-1 text-sm font-bold text-leaf tabular-nums transition-[box-shadow,border-color] duration-300",
                      editing ? "border-papaya shadow-[0_0_0_3px_rgb(255_118_47/0.25)]" : "border-border",
                    )}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <m.span
                        key={price}
                        initial={{ y: 8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -8, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        {price}
                      </m.span>
                    </AnimatePresence>
                    {editing ? <span className="h-4 w-px animate-pulse bg-papaya" /> : null}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 h-8">
            <AnimatePresence>
              {saved ? (
                <m.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-2 rounded-full bg-lime px-3 py-1.5 text-xs font-bold text-leaf"
                >
                  <Check className="size-3.5" strokeWidth={3} />
                  {copy.saved}
                </m.p>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Guest phone showing the change */}
      <PhoneFrame className="-mb-6 hidden w-36 shrink-0 rounded-[1.9rem] p-1.5 sm:block">
        <div className="px-3 pt-3 pb-4">
          <p className="font-heading text-[13px] font-bold text-leaf">{copy.phoneTitle}</p>
          <ul className="mt-2 space-y-1.5">
            {copy.items.map((item, index) => {
              const changed = index === editIndex && saved;
              const price = index === editIndex && saved ? copy.editing : item.price;
              return (
                <li
                  key={item.name}
                  className={cn(
                    "flex flex-col rounded-lg px-2 py-1.5 text-[10px] leading-tight text-leaf transition-colors duration-500",
                    changed ? "bg-lime" : "bg-white",
                  )}
                >
                  <span className="truncate font-semibold">{item.name}</span>
                  <span className="mt-0.5 font-bold tabular-nums">
                    {price} {copy.currency}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </PhoneFrame>
    </div>
  );
}

/* ---------------- Google reviews: rate, then jump to Google ---------------- */

export function ReviewMockup({ copy }: { copy: Features["reviews"]["mock"] }) {
  // 0: empty · 1–5: stars fill · 6: button pressed · 7: thank you
  const { ref, phase } = usePhaseLoop<HTMLDivElement>([1000, 260, 260, 260, 260, 700, 700, 2400]);
  const stars = Math.min(phase, 5);
  const pressed = phase === 6;
  const thanks = phase === 7;

  return (
    <div ref={ref} aria-hidden="true" className="mx-auto w-60 sm:w-64">
      <PhoneFrame>
        <div className="relative flex min-h-[22rem] flex-col items-center px-5 pt-8 pb-6 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-papaya text-leaf">
            <Coffee className="size-6" strokeWidth={2.4} />
          </span>
          <p className="mt-4 font-heading text-lg leading-tight font-bold text-leaf">{copy.question}</p>
          <div className="mt-5 flex gap-1.5">
            {Array.from({ length: 5 }, (_, index) => (
              <m.span
                key={index}
                animate={index < stars ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Star
                  className={cn(
                    "size-7 transition-colors duration-200",
                    index < stars ? "fill-papaya text-papaya" : "text-leaf/25",
                  )}
                />
              </m.span>
            ))}
          </div>
          <m.span
            animate={{ scale: pressed ? 0.94 : 1 }}
            className={cn(
              "mt-auto flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition-colors",
              stars === 5 ? "bg-leaf text-cream" : "bg-leaf/15 text-leaf/50",
            )}
          >
            <Star className="size-4 fill-current" />
            {copy.button}
          </m.span>

          <AnimatePresence>
            {thanks ? (
              <m.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="absolute inset-x-3 bottom-3 rounded-2xl bg-white p-4 text-left shadow-xl"
              >
                <span className="flex gap-0.5 text-papaya">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star key={index} className="size-4 fill-current" />
                  ))}
                </span>
                <p className="mt-2 font-heading text-base font-bold text-leaf">{copy.thanks}</p>
                <span className="mt-2 block h-2 w-4/5 rounded-full bg-leaf/10" />
                <span className="mt-1.5 block h-2 w-3/5 rounded-full bg-leaf/10" />
              </m.div>
            ) : null}
          </AnimatePresence>
        </div>
      </PhoneFrame>
    </div>
  );
}

/* ---------------- Loyalty: tap the NFC tag, a stamp lands ---------------- */

const cardTones = ["bg-leaf text-cream", "bg-papaya text-leaf", "bg-lime text-leaf"];

export function LoyaltyMockup({ copy }: { copy: Features["loyalty"]["mock"] }) {
  // 0: idle · 1: tap · 2: stamp added
  const { ref, phase } = usePhaseLoop<HTMLDivElement>([1400, 900, 2800]);
  const [first, ...others] = copy.cards;
  const stamps = phase === 2 ? first.stamps + 1 : first.stamps;

  return (
    <div ref={ref} aria-hidden="true" className="relative mx-auto flex w-full max-w-md items-center justify-center gap-4 sm:gap-6">
      {/* NFC tag on the counter */}
      <div className="relative grid size-24 shrink-0 place-items-center sm:size-28">
        <AnimatePresence>
          {phase === 1
            ? [0, 0.25].map((delay) => (
                <m.span
                  key={delay}
                  className="absolute inset-0 rounded-full border-2 border-lime"
                  initial={{ scale: 0.7, opacity: 0.9 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, delay, ease: "easeOut" }}
                />
              ))
            : null}
        </AnimatePresence>
        <span className="relative grid size-full place-items-center rounded-full border-[5px] border-cream bg-leaf text-lime shadow-lg">
          <Nfc className="size-9" />
        </span>
        <span className="absolute -bottom-7 text-[11px] font-bold whitespace-nowrap text-leaf">{copy.tap}</span>
      </div>

      <m.div animate={{ x: phase === 1 ? -10 : 0, rotate: phase === 1 ? -4 : 0 }} transition={{ duration: 0.4 }} className="relative w-52 shrink-0 sm:w-56">
        <PhoneFrame>
          <div className="px-3 pt-3 pb-4">
            <p className="font-heading text-[15px] font-bold text-leaf">{copy.title}</p>
            <div className={cn("mt-2.5 rounded-2xl p-3", cardTones[0])}>
              <span className="flex items-center justify-between">
                <span className="text-[12px] font-bold">{first.venue}</span>
                <PapayaMark className="size-5" />
              </span>
              <StampRow filled={stamps} total={first.total} className="mt-2.5" />
              <span className="mt-2 flex items-center justify-between text-[10px]">
                <span className="tabular-nums opacity-85">
                  {stamps}/{first.total} {copy.stamps}
                </span>
                <span className="font-bold">{first.reward}</span>
              </span>
            </div>
            {others.map((card, index) => (
              <div key={card.venue} className={cn("mt-2 rounded-2xl px-3 py-2.5", cardTones[(index + 1) % cardTones.length])}>
                <span className="flex items-center justify-between text-[11px] font-bold">
                  {card.venue}
                  <span className="tabular-nums">
                    {card.stamps}/{card.total}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </PhoneFrame>
        <AnimatePresence>
          {phase === 2 ? (
            <m.span
              initial={{ opacity: 0, scale: 0.6, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="absolute top-6 right-0 rounded-full bg-lime px-3 py-1.5 text-xs font-bold text-leaf shadow-lg sm:-right-4"
            >
              +1 ★
            </m.span>
          ) : null}
        </AnimatePresence>
      </m.div>
    </div>
  );
}
