"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

/**
 * Cycles through `durations.length` phases while the element is on screen.
 * With reduced motion it stays on `stillPhase` (by default the last one).
 */
export function usePhaseLoop<T extends Element>(durations: number[], stillPhase = durations.length - 1) {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState(stillPhase);
  const durationsKey = durations.join(",");

  useEffect(() => {
    if (!inView || reduce) return;
    const steps = durationsKey.split(",").map(Number);
    let current = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setPhase(current);
      timer = setTimeout(() => {
        current = (current + 1) % steps.length;
        tick();
      }, steps[current]);
    };
    tick();
    return () => clearTimeout(timer);
  }, [inView, reduce, durationsKey]);

  return { ref, phase: reduce ? stillPhase : phase };
}
