import { useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { ArrowUpRight, Check, Play, UtensilsCrossed } from "lucide-react";
import type { Dish, Locale } from "./domain";
import { menu, restaurantFor } from "./domain";

const cravings = [
  {
    id: "burger",
    image: "burger.jpg",
    dish: "atom-classic",
    label: ["Burger", "Burger"],
    heading: ["BURGERA", "BURGER"],
    note: [
      "Soczyście, chrupiąco, po Twojemu",
      "Juicy, crispy, just your thing",
    ],
    position: "center 56%",
  },
  {
    id: "ramen",
    image: "ramen.jpg",
    dish: "kago-ramen",
    label: ["Ramen", "Ramen"],
    heading: ["RAMEN", "RAMEN"],
    note: ["Ciepła miska, wielka przyjemność", "A warm bowl of pure happiness"],
    position: "center 48%",
  },
  {
    id: "pizza",
    image: "pizza.jpg",
    dish: "semolino-margherita",
    label: ["Pizza", "Pizza"],
    heading: ["PIZZĘ", "PIZZA"],
    note: ["Jeszcze jeden kawałek? Zawsze", "Room for one more slice? Always"],
    position: "center 62%",
  },
];

export default function CravingHero({
  locale,
  table,
  onBrowse,
  onTour,
  onDish,
}: {
  locale: Locale;
  table: string;
  onBrowse: () => void;
  onTour: () => void;
  onDish: (dish: Dish) => void;
}) {
  const [selected, setSelected] = useState(0);
  const reduced = useReducedMotion();
  const rotateX = useSpring(useMotionValue(0), { stiffness: 110, damping: 24 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 110, damping: 24 });
  const craving = cravings[selected];
  const index = locale === "pl" ? 0 : 1;
  const item =
    menu.find((dish) => dish.id === craving.dish) ||
    menu.find((dish) => dish.image === craving.image)!;
  return (
    <section
      className="craving-hero"
      aria-label={
        locale === "pl" ? "Na co masz ochotę?" : "What are you craving?"
      }
    >
      <div className="craving-copy">
        <motion.p
          className="eyebrow"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="green-dot" /> HALA KOSZYKI ·{" "}
          {locale === "pl"
            ? "TWÓJ STÓŁ, CAŁA HALA"
            : "YOUR TABLE, EVERY KITCHEN"}
        </motion.p>
        <h1>
          <span>{locale === "pl" ? "PORA NA" : "TIME FOR"}</span>
          <span
            className="craving-headline"
            aria-live="polite"
            aria-atomic="true"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={craving.id}
                initial={{ opacity: 0, y: reduced ? 0 : 25 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduced ? 0 : -16 }}
                transition={{ duration: 0.2 }}
              >
                {craving.heading[index]}
              </motion.span>
            </AnimatePresence>
          </span>
        </h1>
        <p className="craving-intro">
          {locale === "pl"
            ? "Różne zachcianki, jeden stolik. Zamów z całej hali i zostań w dobrym towarzystwie."
            : "Different cravings, one table. Order from across the hall and stay in good company."}
        </p>
        <div className="craving-actions">
          <button className="primary" onClick={onBrowse}>
            {locale === "pl"
              ? "Odkryj wszystkie smaki"
              : "Explore every flavour"}
            <ArrowUpRight size={20} />
          </button>
          <button className="text-button" onClick={onTour}>
            <span className="play-circle">
              <Play size={13} fill="currentColor" />
            </span>
            {locale === "pl" ? "Jak to działa" : "How it works"}
          </button>
        </div>
        <div className="craving-promise">
          <Check size={15} />
          <span>{locale === "pl" ? "Bez konta" : "No account"}</span>
          <span aria-hidden="true">·</span>
          <span>{locale === "pl" ? "Jeden koszyk" : "One basket"}</span>
          <span aria-hidden="true">·</span>
          <span>
            {locale === "pl" ? "Twój stolik" : "Your table"} {table}
          </span>
        </div>
      </div>
      <div
        className="craving-stage"
        onPointerMove={(event) => {
          if (reduced || event.pointerType !== "mouse") return;
          const rect = event.currentTarget.getBoundingClientRect();
          rotateX.set(-((event.clientY - rect.top) / rect.height - 0.5) * 3);
          rotateY.set(((event.clientX - rect.left) / rect.width - 0.5) * 3);
        }}
        onPointerLeave={() => {
          rotateX.set(0);
          rotateY.set(0);
        }}
      >
        <motion.div
          className="craving-photo-wrap"
          style={{ rotateX, rotateY }}
          initial={{ opacity: 0, scale: reduced ? 1 : 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: reduced ? 0.12 : 0.6,
            ease: [0.2, 0.8, 0.2, 1],
          }}
        >
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              className="craving-scene"
              key={craving.id}
              initial={{ opacity: 0, scale: reduced ? 1 : 1.035 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <img
                src={`/assets/${craving.image}`}
                alt={
                  item
                    ? locale === "pl"
                      ? item.name
                      : item.nameEn
                    : craving.label[index]
                }
                style={{ objectPosition: craving.position }}
                fetchPriority={selected === 0 ? "high" : "auto"}
              />
              <div className="craving-photo-shade" />
              <div className="craving-photo-caption">
                <span>
                  {item
                    ? restaurantFor(item.restaurantId).name
                    : "HALA KOSZYKI"}
                </span>
                <h2>{craving.note[index]}</h2>
              </div>
            </motion.div>
          </AnimatePresence>
          <motion.span
            className="craving-sticker"
            initial={reduced ? false : { scale: 0.5, rotate: -18, opacity: 0 }}
            animate={{ scale: 1, rotate: 8, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 15,
              delay: 0.25,
            }}
          >
            <UtensilsCrossed size={20} />
            <span>
              {locale === "pl" ? "DOBRZE" : "GOOD"}
              <br />
              {locale === "pl" ? "BYĆ GŁODNYM" : "TO BE HUNGRY"}
            </span>
          </motion.span>
          <button
            className="craving-photo-action"
            onClick={() => (item ? onDish(item) : onBrowse())}
            aria-label={
              locale === "pl" ? `Zobacz ${item.name}` : `See ${item.nameEn}`
            }
          >
            <ArrowUpRight size={23} />
          </button>
        </motion.div>
        <div
          className="craving-selectors"
          role="group"
          aria-label={
            locale === "pl" ? "Wybierz zachciankę" : "Choose a craving"
          }
        >
          {cravings.map((choice, choiceIndex) => (
            <button
              key={choice.id}
              className={selected === choiceIndex ? "selected" : ""}
              aria-pressed={selected === choiceIndex}
              onClick={() => setSelected(choiceIndex)}
            >
              <span className="craving-selector-number">
                0{choiceIndex + 1}
              </span>
              <span>{choice.label[index]}</span>
              <span className="craving-selector-line" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
