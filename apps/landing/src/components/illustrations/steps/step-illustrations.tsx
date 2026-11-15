"use client";

import { useId, useRef } from "react";
import { useInView } from "motion/react";
import { cn } from "@/lib/utils";
import "./steps.css";

/** Plays the CSS loops only while the illustration is on screen. */
function Stage({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const playing = useInView(ref, { amount: 0.35 });
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-playing={playing}
      className={cn("si-root", "relative aspect-[4/3] w-full overflow-hidden rounded-2xl", className)}
    >
      <svg viewBox="0 0 240 180" className="absolute inset-0 size-full">
        {children}
      </svg>
    </div>
  );
}

const a = (cls: string) => `si-a ${cls}`;

function PhoneShell({
  frame = "var(--leaf)",
  screen = "var(--cream)",
  clipId,
  children,
}: {
  frame?: string;
  screen?: string;
  clipId: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <rect x="78" y="20" width="84" height="178" rx="11" />
        </clipPath>
      </defs>
      <rect x="72" y="14" width="96" height="196" rx="16" fill={frame} />
      <rect x="78" y="20" width="84" height="178" rx="11" fill={screen} />
      <g clipPath={`url(#${clipId})`}>{children}</g>
      <rect x="108" y="24" width="24" height="5" rx="2.5" fill={frame} />
    </>
  );
}

/** Small QR glyph: three finder squares plus a few modules. */
function MiniQr({ x, y, size, color = "var(--leaf)" }: { x: number; y: number; size: number; color?: string }) {
  const u = size / 10;
  const finder = (fx: number, fy: number) => (
    <g key={`${fx}-${fy}`}>
      <rect x={x + fx * u + u * 0.3} y={y + fy * u + u * 0.3} width={u * 2.4} height={u * 2.4} rx={u * 0.5} fill="none" stroke={color} strokeWidth={u * 0.6} />
      <rect x={x + fx * u + u * 0.95} y={y + fy * u + u * 0.95} width={u * 1.1} height={u * 1.1} rx={u * 0.2} fill={color} />
    </g>
  );
  const modules = [
    [4.2, 0.6], [5.6, 1.8], [4.2, 3.2], [3.4, 4.6], [5.4, 4.4], [6.8, 4], [8.2, 4.8],
    [0.8, 4.6], [1.8, 5.8], [4.6, 6], [6.2, 6.6], [7.8, 7.2], [4.2, 8.2], [5.8, 8.4], [8.4, 8.6],
  ];
  return (
    <g>
      {finder(0, 0)}
      {finder(7, 0)}
      {finder(0, 7)}
      {modules.map(([mx, my]) => (
        <rect key={`${mx}-${my}`} x={x + mx * u} y={y + my * u} width={u} height={u} rx={u * 0.25} fill={color} />
      ))}
    </g>
  );
}

/* ---------------- Step 1: switch features on in the dashboard ---------------- */

const dashboardRows = [
  { y: 72, tile: "var(--peach)", track: "", knob: "" },
  { y: 98, tile: "var(--lime)", track: "si-track-2", knob: "si-knob-2" },
  { y: 124, tile: "var(--papaya)", track: "si-track-3", knob: "si-knob-3" },
];

function RowGlyph({ index, x, y }: { index: number; x: number; y: number }) {
  if (index === 0) {
    return <path d={`M${x + 3} ${y + 4}h8M${x + 3} ${y + 7}h8M${x + 3} ${y + 10}h5`} stroke="var(--leaf)" strokeWidth="1.4" strokeLinecap="round" />;
  }
  if (index === 1) {
    return (
      <path
        d={`M${x + 7} ${y + 2.5}l1.4 2.9 3.2.4-2.3 2.2.6 3.1-2.9-1.5-2.9 1.5.6-3.1-2.3-2.2 3.2-.4z`}
        fill="var(--leaf)"
      />
    );
  }
  return <circle cx={x + 7} cy={y + 7} r="3.6" fill="none" stroke="var(--leaf)" strokeWidth="1.6" />;
}

export function SetupIllustration({ className }: { className?: string }) {
  const id = useId();
  return (
    <Stage className={className}>
      <defs>
        <clipPath id={`${id}-window`}>
          <rect x="18" y="20" width="204" height="144" rx="12" />
        </clipPath>
      </defs>
      <rect x="18" y="20" width="204" height="144" rx="12" fill="#fff" />
      <g clipPath={`url(#${id}-window)`}>
        <rect x="18" y="20" width="204" height="18" fill="var(--cream)" />
        <circle cx="30" cy="29" r="2.6" fill="var(--papaya)" />
        <circle cx="39" cy="29" r="2.6" fill="var(--lime)" />
        <circle cx="48" cy="29" r="2.6" fill="var(--leaf)" opacity="0.3" />
        <rect x="18" y="38" width="40" height="126" fill="var(--leaf)" />
        <rect x="26" y="50" width="24" height="5" rx="2.5" fill="var(--lime)" />
        <rect x="26" y="62" width="20" height="4" rx="2" fill="var(--cream)" opacity="0.45" />
        <rect x="26" y="72" width="22" height="4" rx="2" fill="var(--cream)" opacity="0.45" />
        <rect x="26" y="82" width="16" height="4" rx="2" fill="var(--cream)" opacity="0.45" />
      </g>
      <rect x="68" y="48" width="62" height="6" rx="3" fill="var(--leaf)" />
      <rect x="68" y="58" width="40" height="4" rx="2" fill="var(--leaf)" opacity="0.3" />

      {dashboardRows.map((row, index) => (
        <g key={row.y}>
          <rect x="68" y={row.y} width="144" height="22" rx="7" fill="var(--cream)" />
          <rect x="74" y={row.y + 4} width="14" height="14" rx="4" fill={row.tile} />
          <RowGlyph index={index} x={74} y={row.y + 4} />
          <rect x="94" y={row.y + 6} width="50" height="4" rx="2" fill="var(--leaf)" />
          <rect x="94" y={row.y + 13} width="32" height="3" rx="1.5" fill="var(--leaf)" opacity="0.35" />
          <rect className={row.track} x="184" y={row.y + 5} width="22" height="12" rx="6" fill="var(--lime)" />
          <circle
            className={row.knob}
            cx="190"
            cy={row.y + 11}
            r="4.5"
            fill="#fff"
            stroke="var(--leaf)"
            strokeOpacity="0.15"
            style={row.knob ? undefined : { transform: "translateX(10px)" }}
          />
        </g>
      ))}

      <g className={a("si-saved")}>
        <rect x="146" y="149" width="66" height="13" rx="6.5" fill="var(--leaf)" />
        <path d="M153 155.5l2.2 2.2 4-4.4" fill="none" stroke="var(--lime)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="164" y="153.5" width="40" height="4" rx="2" fill="var(--cream)" />
      </g>

      <g className={a("si-cursor")}>
        <path
          transform="translate(194 105)"
          d="M0 0v14l3.6-3.4 2.8 6.4 2.6-1.1-2.8-6.3H11z"
          fill="var(--leaf)"
          stroke="#fff"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </g>
    </Stage>
  );
}

/* ---------------- Step 2: the sticker lands on the table ---------------- */

function Sparkle({ x, y, size, fill }: { x: number; y: number; size: number; fill: string }) {
  const h = size / 2;
  return (
    <path
      className={a("si-sparkle")}
      d={`M${x} ${y - h}C${x + h * 0.2} ${y - h * 0.2} ${x + h * 0.2} ${y - h * 0.2} ${x + h} ${y}C${x + h * 0.2} ${y + h * 0.2} ${x + h * 0.2} ${y + h * 0.2} ${x} ${y + h}C${x - h * 0.2} ${y + h * 0.2} ${x - h * 0.2} ${y + h * 0.2} ${x - h} ${y}C${x - h * 0.2} ${y - h * 0.2} ${x - h * 0.2} ${y - h * 0.2} ${x} ${y - h}z`}
      fill={fill}
    />
  );
}

export function StickerIllustration({ className }: { className?: string }) {
  const id = useId();
  return (
    <Stage className={className}>
      {/* tabletop */}
      <rect x="10" y="22" width="220" height="150" rx="16" fill="#f1c79c" />
      <path
        d="M10 60c60-8 120 8 220-4M10 104c70 10 140-10 220 2M10 146c50-6 130 8 220-6"
        fill="none"
        stroke="#d9a574"
        strokeOpacity="0.45"
        strokeWidth="1.5"
      />
      {/* coffee cup, top view */}
      <circle cx="58" cy="72" r="24" fill="#fff" />
      <rect x="78" y="68" width="14" height="8" rx="4" fill="#fff" />
      <circle cx="58" cy="72" r="15" fill="#6b3e26" />
      <circle cx="58" cy="72" r="10" fill="#8a5233" />
      <path d="M53 70c3-4 7-4 10 0-3 4-7 4-10 0z" fill="#f6dcc0" opacity="0.8" />
      {/* napkin */}
      <rect x="34" y="118" width="46" height="34" rx="4" fill="#fff" opacity="0.85" transform="rotate(-6 57 135)" />

      {/* sticker */}
      <ellipse className={a("si-shadow")} cx="153" cy="110" rx="36" ry="33" fill="#7a4a24" opacity="0.18" />
      <g className={a("si-sticker")}>
        <defs>
          <clipPath id={`${id}-sticker`}>
            <circle cx="150" cy="106" r="36" />
          </clipPath>
        </defs>
        <circle cx="150" cy="106" r="36" fill="var(--cream)" />
        <circle cx="150" cy="106" r="31" fill="var(--leaf)" />
        <circle cx="150" cy="84" r="3.6" fill="var(--papaya)" />
        <rect x="126" y="93" width="26" height="26" rx="4" fill="var(--cream)" />
        <MiniQr x={128} y={95} size={22} />
        <g fill="none" stroke="var(--lime)" strokeWidth="2.4" strokeLinecap="round">
          <path d="M160 101.5a6 6 0 0 1 0 9" />
          <path d="M164.5 98a11 11 0 0 1 0 16" />
          <path d="M169 94.5a16 16 0 0 1 0 23" />
        </g>
        <rect x="134" y="124" width="32" height="4" rx="2" fill="var(--cream)" opacity="0.75" />
        <g clipPath={`url(#${id}-sticker)`}>
          <g className="si-shine">
            <rect x="128" y="60" width="14" height="96" fill="#fff" opacity="0.6" transform="rotate(20 135 108)" />
          </g>
        </g>
      </g>

      <Sparkle x={198} y={68} size={14} fill="#fff" />
      <Sparkle x={110} y={146} size={10} fill="var(--leaf)" />
      <Sparkle x={200} y={142} size={9} fill="#fff" />
    </Stage>
  );
}

/* ---------------- Step 3: tap the NFC tag, the App Clip opens ---------------- */

export function TapIllustration({ className }: { className?: string }) {
  const id = useId();
  return (
    <Stage className={className}>
      {/* counter and NFC tag */}
      <rect x="0" y="140" width="240" height="40" fill="#fff" opacity="0.55" />
      <circle className={a("si-wave")} cx="62" cy="136" r="26" fill="none" stroke="var(--leaf)" strokeWidth="2.5" />
      <circle className={a("si-wave si-wave-2")} cx="62" cy="136" r="26" fill="none" stroke="var(--leaf)" strokeWidth="2.5" />
      <circle cx="62" cy="136" r="24" fill="var(--leaf)" />
      <circle cx="62" cy="136" r="24" fill="none" stroke="var(--cream)" strokeWidth="3" />
      <g fill="none" stroke="var(--lime)" strokeWidth="2.4" strokeLinecap="round">
        <path d="M58 131.5a6 6 0 0 1 0 9" />
        <path d="M62.5 128a11 11 0 0 1 0 16" />
        <path d="M67 124.5a16 16 0 0 1 0 23" />
      </g>

      {/* phone approaches the tag */}
      <g className={a("si-approach")}>
        <g transform="translate(46 -4)">
          <PhoneShell clipId={`${id}-screen`}>
            <rect x="86" y="36" width="44" height="5" rx="2.5" fill="var(--leaf)" />
            <rect x="86" y="48" width="68" height="34" rx="7" fill="var(--peach)" />
            <rect x="86" y="88" width="50" height="4" rx="2" fill="var(--leaf)" opacity="0.35" />
            <rect x="86" y="96" width="36" height="4" rx="2" fill="var(--leaf)" opacity="0.35" />
            <rect className="si-dim" x="78" y="20" width="84" height="178" fill="var(--leaf)" fillOpacity="0.35" />
            {/* App Clip card */}
            <g className="si-sheet">
              <rect x="80" y="104" width="80" height="96" rx="10" fill="#fff" />
              <path d="M80 114a10 10 0 0 1 10-10h60a10 10 0 0 1 10 10v20H80z" fill="var(--papaya)" />
              <circle cx="146" cy="116" r="12" fill="#ff8d52" />
              <rect x="86" y="110" width="26" height="8" rx="4" fill="#fff" opacity="0.9" />
              <circle cx="94" cy="146" r="8" fill="var(--leaf)" />
              <circle cx="94" cy="146" r="3" fill="var(--papaya)" />
              <rect x="106" y="141" width="40" height="5" rx="2.5" fill="var(--leaf)" />
              <rect x="106" y="150" width="28" height="3.5" rx="1.75" fill="var(--leaf)" opacity="0.4" />
              <rect x="86" y="163" width="68" height="14" rx="7" fill="var(--papaya)" />
              <rect x="108" y="168" width="24" height="4" rx="2" fill="var(--leaf)" />
            </g>
          </PhoneShell>
        </g>
      </g>
    </Stage>
  );
}

/* ---------------- Step 4: stamps fill up and a reward unlocks ---------------- */

const stampSlots = Array.from({ length: 10 }, (_, index) => ({
  cx: 52 + (index % 5) * 34,
  cy: index < 5 ? 90 : 122,
}));

const rewardConfetti = [
  { dx: "-22px", dy: "-14px", c: "var(--lime)" },
  { dx: "18px", dy: "-18px", c: "var(--papaya)" },
  { dx: "-26px", dy: "10px", c: "var(--papaya)" },
  { dx: "14px", dy: "16px", c: "var(--lime)" },
  { dx: "-6px", dy: "-24px", c: "#fff" },
  { dx: "24px", dy: "0px", c: "#fff" },
];

function FilledStamp({ cx, cy, className }: { cx: number; cy: number; className?: string }) {
  return (
    <g className={className}>
      <circle cx={cx} cy={cy} r="12" fill="var(--cream)" />
      <ellipse cx={cx} cy={cy + 1} rx="5" ry="6" fill="var(--papaya)" transform={`rotate(24 ${cx} ${cy})`} />
      <path d={`M${cx + 1} ${cy - 5}c1.5-3 4-4 6.5-3.6-0.8 2.8-3.4 4-6.5 3.6z`} fill="var(--leaf)" />
    </g>
  );
}

export function RewardIllustration({ className }: { className?: string }) {
  return (
    <Stage className={className}>
      <rect className="si-card-glow" x="21" y="31" width="198" height="122" rx="19" fill="none" stroke="var(--lime)" strokeWidth="4" />
      <rect x="26" y="36" width="188" height="112" rx="16" fill="var(--leaf)" stroke="#fff" strokeOpacity="0.12" />
      <circle cx="46" cy="56" r="7" fill="var(--papaya)" />
      <rect x="58" y="52" width="62" height="6" rx="3" fill="var(--cream)" />
      <rect x="58" y="62" width="36" height="4" rx="2" fill="var(--cream)" opacity="0.5" />

      {stampSlots.map((slot) => (
        <circle
          key={`${slot.cx}-${slot.cy}`}
          cx={slot.cx}
          cy={slot.cy}
          r="11"
          fill="none"
          stroke="var(--cream)"
          strokeOpacity="0.4"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      ))}
      {stampSlots.slice(0, 7).map((slot) => (
        <FilledStamp key={`${slot.cx}-${slot.cy}`} cx={slot.cx} cy={slot.cy} />
      ))}
      <FilledStamp {...stampSlots[7]} className={a("si-stamp")} />
      <FilledStamp {...stampSlots[8]} className={a("si-stamp si-stamp-2")} />
      <FilledStamp {...stampSlots[9]} className={a("si-stamp si-stamp-3")} />

      <g className={a("si-reward")}>
        <circle cx="204" cy="36" r="20" fill="var(--papaya)" stroke="var(--cream)" strokeWidth="3" />
        <rect x="195" y="34" width="18" height="12" rx="2" fill="var(--leaf)" />
        <rect x="193" y="29" width="22" height="6" rx="2" fill="var(--leaf)" />
        <rect x="202.8" y="29" width="2.4" height="17" fill="var(--papaya)" />
        <path d="M204 29c-2-5-8-5-6 0M204 29c2-5 8-5 6 0" fill="none" stroke="var(--leaf)" strokeWidth="2" strokeLinecap="round" />
      </g>
      {rewardConfetti.map((piece) => (
        <rect
          key={`${piece.dx}-${piece.dy}`}
          className={a("si-confetti")}
          x="202"
          y="34"
          width="5"
          height="5"
          rx="1.2"
          fill={piece.c}
          style={{ "--dx": piece.dx, "--dy": piece.dy } as React.CSSProperties}
        />
      ))}
    </Stage>
  );
}
