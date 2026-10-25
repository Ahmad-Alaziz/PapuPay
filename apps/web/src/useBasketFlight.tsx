import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";

type Flight = {
  id: number;
  image: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  target: HTMLElement;
  layer: HTMLElement;
};

function visible(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.top < innerHeight &&
    rect.right > 0 &&
    rect.left < innerWidth
  );
}

/** One interruptible image flight, drawn in the active dialog's top layer. */
export default function useBasketFlight() {
  const [flight, setFlight] = useState<Flight | null>(null);
  const reduced = useReducedMotion();
  const sequence = useRef(0);
  const frames = useRef<number[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cleanup = () => {
    frames.current.forEach(cancelAnimationFrame);
    frames.current = [];
    clearTimeout(timer.current);
  };
  useEffect(() => cleanup, []);

  const launch = (source: HTMLElement | undefined, image: string) => {
    cleanup();
    setFlight(null);
    if (!source || reduced || document.hidden) return;
    const photo =
      source.closest("article")?.querySelector<HTMLImageElement>("img") ||
      source.querySelector<HTMLImageElement>("img") ||
      source
        .closest("dialog")
        ?.querySelector<HTMLImageElement>(".dish-modal-image img");
    const photoRect = photo?.getBoundingClientRect();
    const photoCenterVisible =
      photoRect &&
      photoRect.left + photoRect.width / 2 > 0 &&
      photoRect.left + photoRect.width / 2 < innerWidth &&
      photoRect.top + photoRect.height / 2 > 0 &&
      photoRect.top + photoRect.height / 2 < innerHeight;
    const origin = photo && photoCenterVisible ? photo : source;
    const sourceRect = origin.getBoundingClientRect();
    const start = {
      x: Math.max(
        24,
        Math.min(innerWidth - 24, sourceRect.left + sourceRect.width / 2),
      ),
      y: Math.max(
        24,
        Math.min(innerHeight - 24, sourceRect.top + sourceRect.height / 2),
      ),
    };
    // Wait for the updated basket / returned menu dialog to exist, never invent an endpoint.
    frames.current.push(
      requestAnimationFrame(() => {
        frames.current.push(
          requestAnimationFrame(() => {
            const dialog = Array.from(
              document.querySelectorAll<HTMLDialogElement>("dialog[open]"),
            ).at(-1);
            const scope = dialog || document;
            const targets = Array.from(
              scope.querySelectorAll<HTMLElement>("[data-basket-target]"),
            ).filter(visible);
            const target =
              targets.find(
                (element) => element.dataset.basketTarget === "floating",
              ) || targets[0];
            if (!target) return;
            const rect = target.getBoundingClientRect();
            const end = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            };
            const id = ++sequence.current;
            setFlight({
              id,
              image,
              start,
              end,
              target,
              layer: dialog || document.body,
            });
            timer.current = setTimeout(
              () =>
                setFlight((current) => (current?.id === id ? null : current)),
              550,
            );
          }),
        );
      }),
    );
  };

  const finish = (completed: Flight) => {
    setFlight((current) => (current?.id === completed.id ? null : current));
    if (completed.target.isConnected && !reduced && !document.hidden)
      completed.target.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.045)" },
          { transform: "scale(1)" },
        ],
        { duration: 240, easing: "cubic-bezier(.2,.8,.2,1)" },
      );
  };
  const overlay =
    flight && !reduced
      ? createPortal(
          <motion.img
            key={flight.id}
            className="basket-flight"
            src={flight.image}
            alt=""
            aria-hidden="true"
            style={{ left: flight.start.x - 24, top: flight.start.y - 24 }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{
              x: [
                0,
                (flight.end.x - flight.start.x) * 0.5,
                flight.end.x - flight.start.x,
              ],
              y: [
                0,
                (flight.end.y - flight.start.y) * 0.5 - 36,
                flight.end.y - flight.start.y,
              ],
              scale: [1, 0.9, 0.25],
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 0.42,
              times: [0, 0.5, 1],
              ease: [0.2, 0.8, 0.2, 1],
            }}
            onAnimationComplete={() => finish(flight)}
          />,
          flight.layer,
        )
      : null;
  return { launch, overlay };
}
