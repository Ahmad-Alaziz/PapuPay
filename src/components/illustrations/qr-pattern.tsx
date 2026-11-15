import { cn } from "@/lib/utils";

const SIZE = 21;

function isFinder(x: number, y: number) {
  const inBox = (bx: number, by: number) => x >= bx && x < bx + 7 && y >= by && y < by + 7;
  return inBox(0, 0) || inBox(SIZE - 7, 0) || inBox(0, SIZE - 7);
}

/** Deterministic, decorative QR-like grid. Not scannable. */
const modules: [number, number][] = [];
let seed = 7;
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    seed = (seed * 9301 + 49297) % 233280;
    if (!isFinder(x, y) && seed / 233280 > 0.52) modules.push([x, y]);
  }
}

/** All modules as one path, to keep the DOM small. */
const modulesPath = modules.map(([x, y]) => `M${x + 0.1} ${y + 0.1}h0.8v0.8h-0.8z`).join("");

function Finder({ x, y }: { x: number; y: number }) {
  return (
    <>
      <rect x={x + 0.5} y={y + 0.5} width={6} height={6} rx={0.3} fill="none" stroke="currentColor" strokeWidth={1} />
      <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.15} fill="currentColor" />
    </>
  );
}

export function QrPattern({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={cn("text-leaf", className)} aria-hidden="true">
      <Finder x={0} y={0} />
      <Finder x={SIZE - 7} y={0} />
      <Finder x={0} y={SIZE - 7} />
      <path d={modulesPath} fill="currentColor" />
    </svg>
  );
}
