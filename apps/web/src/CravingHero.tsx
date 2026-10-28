import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { ArrowRight, Pause, Play } from "lucide-react";
import { restaurantFor, type Locale } from "./domain";
import MealStill from "./MealStill";
import "./table-hero.css";

const MealMotion = lazy(() => import("./ComboMotion").catch(() => ({ default: function Still({ stage, onReady }: { stage: number; onReady: () => void }) {
  useEffect(onReady, [onReady]); return <MealStill stage={stage} />;
} })));
const kitchens = [
  { id: "atom", food: "burger" }, { id: "kago", food: "ramen" },
  { id: "semolino", food: "pizza" }, { id: "fry", food: "fries" },
  { id: "curry", food: "curry" }, { id: "gringo", food: "tacos" },
  { id: "tecza", food: "gelato" }, { id: "tuktuk", food: "noodles" },
  { id: "bibimbar", food: "bowl" }, { id: "bar", food: "lemonade" },
].map(kitchen => ({ ...kitchen, restaurant: restaurantFor(kitchen.id) }));
const tour = [3, 6, 0];


function KitchenWindow({ index, phase, width, pl }: { index: number; phase: MotionValue<number>; width: number; pl: boolean }) {
  const kitchen = kitchens[((index % kitchens.length) + kitchens.length) % kitchens.length];
  // These are scenery for the meal story. Ordering starts in the catalog below.
  const delta = useTransform(phase, value => index - value);
  const x = useTransform(delta, value => value * width * (width < 600 ? .36 : .275));
  const y = useTransform(delta, value => Math.pow(Math.abs(value), 1.65) * 25);
  const rotate = useTransform(delta, value => value * 14);
  const scale = useTransform(delta, value => Math.max(.64, 1 - Math.abs(value) * .1));
  const opacity = useTransform(delta, value => Math.min(1, Math.abs(value) * 1.7, Math.max(0, (2.5 - Math.abs(value)) * 2)));
  return <motion.div className="meal-kitchen-window" style={{ x, y, rotate, scale, opacity }}>
    <small>{pl ? "LOKAL" : "COUNTER"} {String(kitchen.restaurant.unit).padStart(2, "0")}</small>
    <img src={`/assets/carousel-${kitchen.food}.webp`} alt="" draggable="false" />
    <strong>{kitchen.restaurant.name}</strong>
  </motion.div>;
}

export default function CravingHero({ locale, table, onBrowse }: { locale: Locale; table: string; onBrowse: () => void }) {
  const reduced = !!useReducedMotion(), pl = locale === "pl";
  const [stage, setStage] = useState(reduced ? 2 : 0), [paused, setPaused] = useState(false), [ready, setReady] = useState(false), [sequence, setSequence] = useState(0);
  const currentStage = useRef(reduced ? 2 : 0);
  const [visible, setVisible] = useState(false), [foreground, setForeground] = useState(!document.hidden), [width, setWidth] = useState(720);
  const scene = useRef<HTMLDivElement>(null), phase = useMotionValue(reduced ? 6 : 0);
  const active = visible && foreground && !paused;
  const destination = sequence === 0 ? 0 : tour[(sequence - 1) % tour.length];
  const markReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .25 });
    const resize = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    if (scene.current) { observer.observe(scene.current); resize.observe(scene.current); }
    const sync = () => setForeground(!document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => { observer.disconnect(); resize.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, []);
  useEffect(() => { if (reduced) { currentStage.current = 2; setStage(2); } }, [reduced]);
  useEffect(() => {
    if (reduced) { phase.set(6); return; }
    if (!active) return;
    const resetting = sequence > 0 && sequence % 3 === 0;
    const travel = animate(phase, destination, { type: "spring", duration: resetting ? 2.6 : 2.1, bounce: .1 });
    // Each pass builds one meal, holds it, then returns to a fresh burger.
    const nextStage = sequence === 0 ? 0 : sequence % 3;
    const timer = nextStage !== currentStage.current ? setTimeout(() => {
      currentStage.current = nextStage;
      setStage(nextStage);
    }, resetting ? 1600 : 1350) : undefined;
    return () => { travel.stop(); clearTimeout(timer); };
  }, [destination, sequence, phase, active, reduced]);
  useEffect(() => {
    if (!active || reduced || !ready) return;
    const timer = setTimeout(() => setSequence(value => value + 1), sequence === 0 ? 2400 : sequence % 3 === 2 ? 5900 : sequence % 3 === 0 ? 4400 : 3900);
    return () => clearTimeout(timer);
  }, [active, reduced, ready, sequence]);

  const captions = pl ? ["Burger z ATOM Burgers", "+ frytki z The Fry", "Trzy kuchnie, jeden posiłek"] : ["A burger from ATOM Burgers", "+ fries from The Fry", "Three kitchens, one meal"];
  return <section className="meal-hero" aria-label={pl ? "Różne kuchnie, jeden koszyk" : "Different kitchens, one basket"}>
    <div className="meal-hero-copy">
      <div><p className="eyebrow meal-hero-context"><span className="green-dot" />HALA KOSZYKI<span>/</span>{pl ? "STOLIK" : "TABLE"} {table}</p>
        <h1><span>{pl ? "CAŁA HALA" : "ONE FOOD HALL"}</span><span>{pl ? "JEDEN KOSZYK" : "ONE BASKET"}</span></h1></div>
      <p className="meal-hero-intro">{pl ? "Burger, frytki i coś słodkiego. Z różnych kuchni, w jednym zamówieniu." : "A burger, fries and something sweet. Different kitchens, one order."}</p>
    </div>
    <div className="meal-stage" ref={scene}>
      <div className="meal-utility"><span>{pl ? "RÓŻNE KUCHNIE · JEDEN KOSZYK" : "DIFFERENT KITCHENS · ONE BASKET"}</span>{!reduced && <button className="meal-play" aria-label={paused ? (pl ? "Wznów animację" : "Resume animation") : (pl ? "Wstrzymaj animację" : "Pause animation")} onClick={() => setPaused(value => !value)}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>}</div>
      <div className="meal-illustration" role="img" aria-label={pl ? "Przykładowy posiłek: burger z ATOM Burgers, frytki z The Fry i lody z Na końcu tęczy. Trzy kuchnie w jednym zamówieniu." : "An example meal: a burger from ATOM Burgers, fries from The Fry and ice cream from Na końcu tęczy. Three kitchens in one order."}>
        <div className="meal-ground" aria-hidden="true" />
        <div className="meal-windows" aria-hidden="true">{Array.from({ length: 16 }, (_, index) => index - 3).map(index => <KitchenWindow key={index} index={index} phase={phase} width={width} pl={pl} />)}</div>
        <div className="meal-food" aria-hidden="true"><Suspense fallback={<MealStill stage={stage} />}><MealMotion stage={stage} active={active} reduced={reduced} onReady={markReady} /></Suspense></div>
      </div>
      <div className="meal-caption" aria-hidden="true"><AnimatePresence initial={false} mode="wait"><motion.div key={stage} initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -6 }} transition={{ duration: reduced ? 0 : .2 }}><span className="meal-story-dots">{[0, 1, 2].map(index => <i key={index} className={index <= stage ? "arrived" : ""} />)}</span><strong>{captions[stage]}</strong></motion.div></AnimatePresence></div>
    </div>
    <div className="meal-hero-footer"><p>{pl ? "Łącz smaki po swojemu. Zapłać raz, odbierz przy stanowiskach." : "Mix it your way. Pay once, collect at the counters."}</p><button className="primary meal-browse" onClick={onBrowse}>{pl ? "Wybierz coś dla siebie" : "Explore the kitchens"}<ArrowRight size={18} /></button></div>
  </section>;
}
