import { useId } from "react";
import { cn } from "@/lib/utils";

const blobs = {
  round:
    "M60.1,-63.4C75.5,-46.8,83.2,-23.4,81.4,-1.8C79.6,19.8,68.3,39.6,52.9,55.8C37.6,72,18.8,84.6,-2.5,87.1C-23.8,89.6,-47.5,82,-63.6,65.8C-79.7,49.6,-88.1,24.8,-86.9,1.2C-85.7,-22.4,-74.9,-44.8,-58.8,-61.4C-42.7,-78,-21.3,-88.8,0.9,-89.7C23.2,-90.6,44.7,-80,60.1,-63.4Z",
  wavy:
    "M47.3,-57.1C59.6,-45.7,67,-29.3,70.9,-11.6C74.8,6.2,75.2,25.3,66.5,39.4C57.8,53.5,40,62.6,21.6,68.4C3.2,74.2,-15.8,76.7,-33.2,70.9C-50.6,65.1,-66.4,51,-74.6,33.2C-82.8,15.4,-83.4,-6,-76.2,-23.8C-69,-41.6,-54,-55.8,-37.8,-66.4C-21.6,-77,-4.3,-84,11.4,-80.4C27.1,-76.8,35,-68.5,47.3,-57.1Z",
};

type Fill = "peach" | "papaya" | "amber";

function Blob({ shape, fill }: { shape: keyof typeof blobs; fill: Fill }) {
  const id = useId();
  return (
    <svg viewBox="-100 -100 200 200" className="size-full">
      {fill !== "peach" ? (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={fill === "papaya" ? "#ff8a45" : "#ffb347"} />
            <stop offset="100%" stopColor={fill === "papaya" ? "#ff762f" : "#f5902c"} />
          </linearGradient>
        </defs>
      ) : null}
      <path d={blobs[shape]} fill={fill === "peach" ? "var(--peach)" : `url(#${id})`} />
    </svg>
  );
}

function Leaf() {
  return (
    <svg viewBox="0 0 100 100" className="size-full">
      <path d="M6 94C6 46 40 8 94 6C94 56 58 94 6 94Z" fill="var(--leaf)" />
    </svg>
  );
}

function Seeds({ fill }: { fill: "papaya" | "leaf" }) {
  const color = fill === "papaya" ? "var(--papaya)" : "var(--leaf)";
  return (
    <svg viewBox="0 0 60 80" className="size-full">
      <ellipse cx="18" cy="22" rx="7" ry="11" transform="rotate(25 18 22)" fill={color} />
      <ellipse cx="40" cy="44" rx="6" ry="9.5" transform="rotate(-30 40 44)" fill={color} />
      <ellipse cx="20" cy="62" rx="5" ry="8" transform="rotate(40 20 62)" fill={color} />
    </svg>
  );
}

type Item = {
  /** Vertical position as a share of the page height, or a CSS length. */
  top: string;
  /** Horizontal placement (e.g. `{ left: "-14rem" }`). */
  x: { left?: string; right?: string };
  size: string;
  /** Parallax strength: pixels moved over the full page scroll. */
  speed: number;
  rotate?: number;
  /** Strong colours only render on wide screens, where they sit in the side gutters. */
  wideOnly?: boolean;
  drift?: boolean;
  shape: React.ReactNode;
};

const items: Item[] = [
  { top: "-6rem", x: { right: "-15rem" }, size: "40rem", speed: 60, shape: <Blob shape="round" fill="peach" /> },
  { top: "5%", x: { left: "-19rem" }, size: "30rem", speed: 120, shape: <Blob shape="wavy" fill="peach" /> },
  { top: "9%", x: { left: "-17rem" }, size: "22rem", speed: 220, rotate: 20, wideOnly: true, shape: <Blob shape="wavy" fill="papaya" /> },
  { top: "15%", x: { left: "1.5rem" }, size: "3.5rem", speed: 320, wideOnly: true, drift: true, shape: <Seeds fill="papaya" /> },
  { top: "21%", x: { right: "-6rem" }, size: "12rem", speed: 260, rotate: -15, wideOnly: true, drift: true, shape: <Leaf /> },
  { top: "26%", x: { right: "2rem" }, size: "3rem", speed: 340, wideOnly: true, drift: true, shape: <Seeds fill="papaya" /> },
  { top: "32%", x: { right: "-21rem" }, size: "36rem", speed: 90, shape: <Blob shape="round" fill="peach" /> },
  { top: "45%", x: { right: "-15rem" }, size: "22rem", speed: 200, rotate: -25, wideOnly: true, shape: <Blob shape="round" fill="amber" /> },
  { top: "50%", x: { right: "1.5rem" }, size: "3.5rem", speed: 300, wideOnly: true, drift: true, shape: <Seeds fill="leaf" /> },
  { top: "55%", x: { left: "-21rem" }, size: "34rem", speed: 110, shape: <Blob shape="wavy" fill="peach" /> },
  { top: "66%", x: { left: "-6.5rem" }, size: "11rem", speed: 240, rotate: 200, wideOnly: true, drift: true, shape: <Leaf /> },
  { top: "71%", x: { left: "-3rem" }, size: "7rem", speed: 300, rotate: 120, wideOnly: true, drift: true, shape: <Leaf /> },
  { top: "77%", x: { right: "-19rem" }, size: "32rem", speed: 80, shape: <Blob shape="round" fill="peach" /> },
  { top: "86%", x: { left: "-15rem" }, size: "20rem", speed: 160, rotate: 60, wideOnly: true, shape: <Blob shape="round" fill="papaya" /> },
  { top: "84%", x: { left: "2rem" }, size: "3rem", speed: 260, wideOnly: true, drift: true, shape: <Seeds fill="papaya" /> },
];

function Shape({ item }: { item: Item }) {
  return (
    <div
      className={cn("bg-parallax absolute", item.wideOnly && "hidden xl:block")}
      style={{ top: item.top, ...item.x, width: item.size, height: item.size, "--speed": item.speed } as React.CSSProperties}
    >
      <div
        className={cn("size-full", item.drift && "animate-drift")}
        style={{ rotate: item.rotate ? `${item.rotate}deg` : undefined }}
      >
        {item.shape}
      </div>
    </div>
  );
}

/**
 * Decorative organic shapes behind the whole page. Parallax uses CSS
 * scroll-driven animations (see `.bg-parallax` in globals.css), so no JS runs on scroll.
 */
export function PageBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {items.map((item, index) => (
        <Shape key={index} item={item} />
      ))}
    </div>
  );
}
