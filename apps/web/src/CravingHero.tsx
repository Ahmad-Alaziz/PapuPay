import { Component, lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowRight, Check, Play } from "lucide-react";
import type { Locale } from "./domain";
import "./table-hero.css";

const TableMotion = lazy(() => import("./TableMotion"));
const dishes = [
  { id: "atom", image: "table-burger.webp" },
  { id: "kago", image: "table-ramen.webp" },
  { id: "semolino", image: "table-pizza.webp" },
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

function TableFallback() {
  return (
    <div className="table-still" aria-hidden="true">
      <div className="table-still-shadow" />
      <div className="table-still-surface" />
      {dishes.map((dish) => (
        <img
          key={dish.id}
          className={`table-food table-food-${dish.id}`}
          src={`/assets/${dish.image}`}
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
}: {
  locale: Locale;
  table: string;
  onBrowse: () => void;
  onTour: () => void;
}) {
  const [canAnimate, setCanAnimate] = useState(false);
  const sceneHost = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const pl = locale === "pl";
  const fallback = <TableFallback />;
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
      <div className="table-hero-scene" ref={sceneHost} aria-hidden="true">
        <div className="table-scene-visual">
          {!reduced && canAnimate ? (
            <TableSceneBoundary fallback={fallback}>
              <Suspense fallback={fallback}>
                <TableMotion fallback={fallback} />
              </Suspense>
            </TableSceneBoundary>
          ) : (
            fallback
          )}
        </div>
      </div>
    </section>
  );
}
