import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, MapPin, Play } from "lucide-react";
import type { Locale } from "./domain";
import "./table-hero.css";

/** Establish the place and the benefit, then let people get straight to food. */
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
  const reduced = useReducedMotion();
  const pl = locale === "pl";
  return (
    <section
      className="venue-hero"
      aria-label={pl ? "Cała hala, jeden koszyk" : "One food hall, one basket"}
    >
      <div className="venue-hero-copy">
        <p className="eyebrow venue-hero-context">
          <span className="green-dot" />
          HALA KOSZYKI<span aria-hidden="true">/</span>
          <span>
            {pl ? "STOLIK" : "TABLE"} {table}
          </span>
        </p>
        <h1>
          <span>{pl ? "CAŁA HALA" : "ONE FOOD HALL"}</span>
          <span>{pl ? "JEDEN KOSZYK" : "ONE BASKET"}</span>
        </h1>
        <p className="venue-hero-intro">
          {pl
            ? "Wybieraj z kuchni Hali Koszyki. Płać raz. Odbierz, gdy gotowe."
            : "Mix your favourites from Hala Koszyki. Pay once. Pick up when ready."}
        </p>
        <div className="venue-hero-actions">
          <button className="primary" onClick={onBrowse}>
            {pl ? "Odkryj kuchnie" : "Explore kitchens"}
            <ArrowRight size={19} />
          </button>
          <button className="text-button" onClick={onTour}>
            <span className="venue-play">
              <Play size={12} fill="currentColor" />
            </span>
            {pl ? "Jak to działa" : "How it works"}
          </button>
        </div>
        <p className="venue-hero-promise">
          <Check size={14} />
          {pl ? "Bez konta" : "No account"}
          <span aria-hidden="true">·</span>
          {pl ? "Jeden koszyk" : "One basket"}
          <span aria-hidden="true">·</span>
          {pl ? "Więcej czasu razem" : "More time together"}
        </p>
      </div>
      <motion.figure
        className="venue-hero-photo"
        initial={{ opacity: reduced ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.img
          src="/assets/hall-detail.jpg"
          alt={
            pl
              ? "Zielone sklepienie i lokale Hali Koszyki"
              : "The green vaulted roof and kitchens of Hala Koszyki"
          }
          fetchPriority="high"
          initial={{ scale: reduced ? 1 : 1.025 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.65, ease: [0.2, 0.7, 0.2, 1] }}
        />
        <figcaption>
          <MapPin size={15} />
          Koszykowa 63, Warszawa
        </figcaption>
      </motion.figure>
    </section>
  );
}
