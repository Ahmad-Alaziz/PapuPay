import { Component, lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Check,
  CornerDownRight,
  Play,
  RotateCcw,
} from "lucide-react";
import type { Dish, Locale } from "./domain";
import { menu } from "./domain";
import "./table-hero.css";

const TableMotion = lazy(() => import("./TableMotion"));
const kitchens = [
  {
    id: "atom",
    selection: 1,
    dish: "atom-classic",
    image: "table-burger.webp",
    label: "ATOM",
    taste: ["Smash burgery", "Smash burgers"],
    control: ["Burgery z ATOM", "Burgers from ATOM"],
  },
  {
    id: "kago",
    selection: 2,
    dish: "kago-ramen",
    image: "table-ramen.webp",
    label: "KAGO",
    taste: ["Ramen i japońskie smaki", "Ramen and Japanese flavours"],
    control: ["Ramen z KAGO", "Ramen from KAGO"],
  },
  {
    id: "semolino",
    selection: 3,
    dish: "semolino-margherita",
    image: "table-pizza.webp",
    label: "Semolino",
    taste: ["Pizza, pasta, amore", "Pizza, pasta, amore"],
    control: ["Pizza z Semolino", "Pizza from Semolino"],
  },
];

class TableSceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function TableFallback({ selected }: { selected: number }) {
  return (
    <div
      className={`table-still ${selected ? "has-selection" : ""}`}
      aria-hidden="true"
    >
      <div className="table-still-shadow" />
      <div className="table-still-surface" />
      {kitchens.map((kitchen) => (
        <img
          key={kitchen.id}
          className={`table-food table-food-${kitchen.id} ${selected === kitchen.selection ? "is-selected" : ""}`}
          src={`/assets/${kitchen.image}`}
          alt=""
          fetchPriority="high"
        />
      ))}
    </div>
  );
}

export default function CravingHero({
  locale,
  table,
  onBrowse,
  onTour,
  onDish,
  onMenu,
}: {
  locale: Locale;
  table: string;
  onBrowse: () => void;
  onTour: () => void;
  onDish: (dish: Dish) => void;
  onMenu?: (restaurantId: string) => void;
}) {
  const [selected, setSelected] = useState(0);
  const [canAnimate, setCanAnimate] = useState(false);
  const sceneHost = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const pl = locale === "pl";
  const choice = kitchens.find((kitchen) => kitchen.selection === selected);
  const fallback = <TableFallback selected={selected} />;
  useEffect(() => {
    if (reduced) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCanAnimate(true);
          observer.disconnect();
        }
      },
      { rootMargin: "80px" },
    );
    if (sceneHost.current) observer.observe(sceneHost.current);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <section
      className="table-hero"
      aria-label={pl ? "Różne smaki, jeden stolik" : "Many cravings, one table"}
    >
      <div className="table-hero-copy">
        <p className="eyebrow table-hero-context">
          <span className="green-dot" />
          HALA KOSZYKI
          <span className="table-context-divider" aria-hidden="true">
            /
          </span>
          <span>
            {pl ? "STOLIK" : "TABLE"} {table}
          </span>
        </p>
        <h1>
          <span>{pl ? "RÓŻNE SMAKI" : "MANY CRAVINGS"}</span>
          <span>{pl ? "JEDEN STOLIK" : "ONE TABLE"}</span>
        </h1>
        <p className="table-hero-intro">
          {pl
            ? "Łącz dania z różnych kuchni. Jeden koszyk, odbiór gdy gotowe."
            : "Different kitchens, one basket. Pick up when ready and enjoy together."}
        </p>
        <div className="table-hero-actions">
          <button className="primary" onClick={onBrowse}>
            {pl ? "Odkryj kuchnie" : "Explore kitchens"}
            <ArrowRight size={19} />
          </button>
          <button className="text-button" onClick={onTour}>
            <span className="table-play">
              <Play size={12} fill="currentColor" />
            </span>
            {pl ? "Jak to działa" : "How it works"}
          </button>
        </div>
        <p className="table-hero-promise">
          <Check size={14} />
          {pl ? "Bez konta" : "No account"}
          <span aria-hidden="true">·</span>
          {pl ? "Jeden koszyk" : "One basket"}
          <span aria-hidden="true">·</span>
          {pl ? "Więcej czasu razem" : "More time together"}
        </p>
      </div>
      <div className="table-hero-scene" ref={sceneHost}>
        <div className="table-scene-hint">
          <CornerDownRight size={16} />
          <span>
            {pl
              ? "Dotknij tego, na co masz ochotę"
              : "Tap whatever you’re craving"}
          </span>
        </div>
        <div className="table-scene-visual">
          {!reduced && canAnimate ? (
            <TableSceneBoundary fallback={fallback}>
              <Suspense fallback={fallback}>
                <TableMotion selected={selected} fallback={fallback} />
              </Suspense>
            </TableSceneBoundary>
          ) : (
            fallback
          )}
          <div
            className="table-food-controls"
            role="group"
            aria-label={
              pl ? "Kuchnie przy wspólnym stole" : "Kitchens at your table"
            }
          >
            {kitchens.map((kitchen) => (
              <button
                key={kitchen.id}
                className={`table-food-control table-control-${kitchen.id} ${selected === kitchen.selection ? "is-selected" : ""}`}
                aria-label={kitchen.control[pl ? 0 : 1]}
                aria-pressed={selected === kitchen.selection}
                onClick={() =>
                  setSelected(
                    selected === kitchen.selection ? 0 : kitchen.selection,
                  )
                }
              >
                <span>
                  {kitchen.label}
                  <span className="table-selection-dot" />
                </span>
              </button>
            ))}
          </div>
        </div>
        <div
          className="table-scene-caption"
          aria-live="polite"
          aria-atomic="true"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selected}
              className="table-caption-content"
              initial={{ opacity: 0, y: reduced ? 0 : 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -4 }}
              transition={{ duration: 0.14 }}
            >
              <div>
                <strong>
                  {choice
                    ? choice.label
                    : pl
                      ? "Każdy wybiera po swojemu"
                      : "Everyone gets their favourite"}
                </strong>
                <span>
                  {choice
                    ? choice.taste[pl ? 0 : 1]
                    : pl
                      ? "Wszystkie smaki spotykają się przy stole"
                      : "Every flavour meets at one table"}
                </span>
              </div>
              {choice ? (
                <button
                  className="table-menu-link"
                  onClick={() =>
                    onMenu
                      ? onMenu(choice.id)
                      : onDish(menu.find((dish) => dish.id === choice.dish)!)
                  }
                >
                  {onMenu
                    ? pl
                      ? "Zobacz menu"
                      : "View menu"
                    : pl
                      ? "Zobacz danie"
                      : "See dish"}
                  <ArrowRight size={16} />
                </button>
              ) : (
                <span className="table-caption-mark" aria-hidden="true">
                  <Check size={18} />
                </span>
              )}
            </motion.div>
          </AnimatePresence>
          {choice && (
            <button
              className="table-reset"
              aria-label={pl ? "Pokaż cały stolik" : "Show the whole table"}
              onClick={() => setSelected(0)}
            >
              <RotateCcw size={15} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
