"use client";

import * as m from "motion/react-m";
import { Nfc, Stamp } from "lucide-react";
import { PhoneMockup } from "@/components/illustrations/phone-mockup";
import { QrPattern } from "@/components/illustrations/qr-pattern";
import type { Dictionary } from "@/i18n/dictionaries";

const ease = [0.22, 1, 0.36, 1] as const;

export function HeroVisual({ copy }: { copy: Dictionary["mockup"] }) {
  return (
    <div className="relative mx-auto w-full max-w-[26rem] pt-6 pb-10 sm:pt-10">
      {/* Bento backdrop */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 bottom-0 overflow-hidden rounded-[2.5rem] bg-papaya">
        <div className="absolute -top-16 -left-20 size-64 rounded-full bg-[#ff8d52]" />
        <div className="absolute -right-16 bottom-10 size-56 rounded-full bg-peach/60" />
        <div className="absolute -right-12 -bottom-12 size-44 rounded-full bg-lime" />
      </div>

      <m.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease, delay: 0.15 }}
        className="relative mx-auto w-[15.5rem] sm:w-[17rem]"
      >
        <PhoneMockup copy={copy} />
      </m.div>

      <m.div
        aria-hidden="true"
        initial={{ opacity: 0, y: -16, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.9 }}
        className="absolute top-2 -right-1 w-56 sm:top-6 sm:-right-8"
      >
        <div className="flex animate-bob items-start gap-2.5 rounded-2xl bg-white/95 p-3 shadow-[0_20px_40px_-20px_rgb(23_61_43/0.55)] backdrop-blur">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lime text-leaf">
            <Stamp className="size-4.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] leading-tight font-bold text-leaf">{copy.notificationTitle}</span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">{copy.notificationBody}</span>
          </span>
        </div>
      </m.div>

      {/* Table sticker: QR for the menu, NFC for loyalty */}
      <m.div
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.6, rotate: -30 }}
        animate={{ opacity: 1, scale: 1, rotate: -8 }}
        transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.55 }}
        className="absolute -bottom-6 left-0 sm:-left-16"
      >
        <div className="grid size-32 place-items-center rounded-full border-[5px] border-cream bg-leaf p-3.5 text-center text-cream shadow-xl sm:size-36">
          <span className="font-heading text-[12px] font-extrabold tracking-tight">papupay</span>
          <span className="flex items-center gap-1.5">
            <span className="block w-11 rounded-[3px] bg-cream p-1">
              <QrPattern className="w-full" />
            </span>
            <Nfc className="size-7 text-lime" />
          </span>
          <span className="text-[9px] leading-tight font-semibold text-cream/85">{copy.sticker}</span>
        </div>
      </m.div>
    </div>
  );
}
