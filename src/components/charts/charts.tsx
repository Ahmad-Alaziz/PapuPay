"use client";

import { useEffect, useId, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { cn } from "@/lib/utils";
import type { Stat } from "@/content/stats";

const ease = [0.22, 1, 0.36, 1] as const;
const viewport = { once: true, margin: "0px 0px -12% 0px" } as const;

/** Counts up to the stat's value the first time it scrolls into view. */
export function CountUp({ stat, className }: { stat: Stat; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, viewport);
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(stat.value);

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, stat.value, {
      duration: 1.4,
      ease,
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, reduce, stat.value]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {stat.prefix}
      {display}
      {stat.suffix}
    </span>
  );
}

type AreaChartProps = {
  series: number[];
  beforeCount: number;
  labels: { before: string; after: string };
};

/** Smooth rising line with a soft fill that stretches to its container. Decorative; the value is stated in text. */
export function AreaChart({ series, beforeCount, labels }: AreaChartProps) {
  const gradientId = useId();
  const width = 300;
  const height = 200;
  const min = Math.min(...series) - 4;
  const max = Math.max(...series);
  const points = series.map((value, index) => ({
    x: (index / (series.length - 1)) * width,
    y: height - 14 - ((value - min) / (max - min)) * (height - 40),
  }));

  const line = points.reduce((path, point, index) => {
    if (index === 0) return `M${point.x},${point.y}`;
    const prev = points[index - 1];
    const midX = (prev.x + point.x) / 2;
    return `${path} C${midX},${prev.y} ${midX},${point.y} ${point.x},${point.y}`;
  }, "");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const last = points[points.length - 1];
  const splitX = points[beforeCount - 1]?.x ?? 0;

  return (
    <div aria-hidden="true" className="flex min-h-40 flex-1 flex-col">
      <div className="relative flex-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--lime)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--lime)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              x2={width}
              y1={height * ratio}
              y2={height * ratio}
              stroke="currentColor"
              strokeOpacity="0.12"
              strokeDasharray="3 5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <line
            x1={splitX}
            x2={splitX}
            y1="8"
            y2={height}
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
          <m.path
            d={area}
            fill={`url(#${gradientId})`}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={viewport}
            transition={{ duration: 0.8, delay: 0.9 }}
          />
          <m.path
            d={line}
            fill="none"
            stroke="var(--lime)"
            strokeWidth="3.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={viewport}
            transition={{ duration: 1.6, ease }}
          />
        </svg>
        <m.span
          className="absolute size-3 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${(last.x / width) * 100}%`, top: `${(last.y / height) * 100}%` }}
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={viewport}
          transition={{ type: "spring", stiffness: 300, damping: 18, delay: 1.5 }}
        >
          <span className="absolute inset-0 animate-ping-soft rounded-full bg-lime/40" />
          <span className="absolute inset-0 rounded-full border-2 border-leaf bg-lime" />
        </m.span>
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-semibold tracking-wide uppercase opacity-70">
        <span>{labels.before}</span>
        <span>{labels.after}</span>
      </div>
    </div>
  );
}

type RisingBarsProps = {
  bars: number[];
  beforeCount: number;
  labels: { before: string; after: string };
};

export function RisingBars({ bars, beforeCount, labels }: RisingBarsProps) {
  const max = Math.max(...bars);
  return (
    <div aria-hidden="true">
      <div className="flex h-28 items-end gap-2">
        {bars.map((value, index) => {
          const after = index >= beforeCount;
          return (
            <m.div
              key={index}
              className={cn("flex-1 rounded-t-lg rounded-b-sm", after ? "bg-leaf" : "bg-leaf/25")}
              style={{ height: `${(value / max) * 100}%`, originY: 1 }}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={viewport}
              transition={{ duration: 0.7, ease, delay: 0.15 + index * 0.08 }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex text-[11px] font-semibold tracking-wide uppercase">
        <span style={{ width: `${(beforeCount / bars.length) * 100}%` }}>{labels.before}</span>
        <span>{labels.after}</span>
      </div>
    </div>
  );
}

/** Ring showing how much of the original effort remains (1 − reduction). */
export function ProgressRing({ stat }: { stat: Stat }) {
  const remaining = 1 - stat.value / 100;
  return (
    <div className="relative size-32 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--leaf)" strokeOpacity="0.12" strokeWidth="14" />
        <m.circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="var(--papaya)"
          strokeWidth="14"
          strokeLinecap="round"
          initial={{ pathLength: 1 }}
          whileInView={{ pathLength: remaining }}
          viewport={viewport}
          transition={{ duration: 1.4, ease, delay: 0.2 }}
        />
      </svg>
      <CountUp
        stat={stat}
        className="absolute inset-0 grid place-items-center font-heading text-3xl font-extrabold tracking-tight"
      />
    </div>
  );
}

/** Feature switches that flip on one after another when scrolled into view. */
export function FeatureToggles({ features }: { features: string[] }) {
  return (
    <ul aria-hidden="true" className="flex flex-1 flex-col justify-evenly gap-3">
      {features.map((feature, index) => (
        <li key={feature} className="flex items-center justify-between gap-3 rounded-2xl bg-white/60 px-4 py-3">
          <span className="text-sm font-bold">{feature}</span>
          <m.span
            className="relative h-6 w-11 shrink-0 rounded-full"
            initial={{ backgroundColor: "rgb(23 61 43 / 0.2)" }}
            whileInView={{ backgroundColor: "rgb(23 61 43 / 1)" }}
            viewport={viewport}
            transition={{ duration: 0.3, delay: 0.5 + index * 0.45 }}
          >
            <m.span
              className="absolute top-1 left-1 size-4 rounded-full bg-lime"
              initial={{ x: 0 }}
              whileInView={{ x: 20 }}
              viewport={viewport}
              transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.5 + index * 0.45 }}
            />
          </m.span>
        </li>
      ))}
    </ul>
  );
}
