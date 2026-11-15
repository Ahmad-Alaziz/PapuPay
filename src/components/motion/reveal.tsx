"use client";

import * as m from "motion/react-m";
import type { Variants } from "motion/react";

const ease = [0.22, 1, 0.36, 1] as const;

const viewport = { once: true, margin: "0px 0px -12% 0px" } as const;

type RevealProps = React.ComponentProps<typeof m.div> & {
  delay?: number;
  /** Distance in px the element travels upward while fading in. */
  y?: number;
};

/** Fades and lifts its children into view the first time they scroll on screen. */
export function Reveal({ delay = 0, y = 24, children, ...props }: RevealProps) {
  return (
    <m.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: 0.7, ease, delay }}
      {...props}
    >
      {children}
    </m.div>
  );
}

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease } },
};

type StaggerProps = React.ComponentProps<typeof m.ul>;

/** A list whose `StaggerItem` children reveal one after another. */
export function Stagger({ children, ...props }: StaggerProps) {
  return (
    <m.ul initial="hidden" whileInView="visible" viewport={viewport} variants={container} {...props}>
      {children}
    </m.ul>
  );
}

export function StaggerItem({ children, ...props }: React.ComponentProps<typeof m.li>) {
  return (
    <m.li variants={item} {...props}>
      {children}
    </m.li>
  );
}
