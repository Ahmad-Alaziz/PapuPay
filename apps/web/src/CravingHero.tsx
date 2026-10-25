import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, MoveHorizontal } from "lucide-react";
import ComboReview from "./ComboReview";
import type { ComboSelection } from "./ComboReview";
import type { CartLine, Locale } from "./domain";
import "./table-hero.css";

const ComboMotion = lazy(() => import("./ComboMotion").catch(() => ({ default: function StaticCombo({ stage, onReady }: { stage: number; onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return <div className="combo-motion"><img className="combo-still" src={"/assets/combo-stage-" + stage + ".webp"} alt="" /></div>;
} })));
const vendors = [
  { name: "ATOM", detail: "Burgers & Deli", pl: "Smash Burger", en: "Smash Burger", unit: "08" },
  { name: "The Fry", detail: "Belgian fries", pl: "+ frytki", en: "+ fries", unit: "07" },
  { name: "Na końcu tęczy", detail: "Lody rzemieślnicze", pl: "+ lody", en: "+ ice cream", unit: "20" },
];
function seen() { try { return sessionStorage.getItem("papupay-combo-seen") === "yes"; } catch { return false; } }
function remember() { try { sessionStorage.setItem("papupay-combo-seen", "yes"); } catch { /* Storage is optional. */ } }

export default function CravingHero({ locale, table, cart, onBrowse, onAddCombo }: {
  locale: Locale; table: string; cart: CartLine[]; onBrowse: () => void; onAddCombo: (items: ComboSelection[]) => void;
}) {
  const reduced = !!useReducedMotion(), pl = locale === "pl";
  const [stage, setStage] = useState(() => seen() || matchMedia("(prefers-reduced-motion: reduce)").matches ? 2 : 0);
  const [manual, setManual] = useState(seen), [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false), [foreground, setForeground] = useState(!document.hidden);
  const [review, setReview] = useState(false);
  const scene = useRef<HTMLDivElement>(null), gesture = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const markReady = useCallback(() => setReady(true), []);
  const choose = (next: number) => { setManual(true); remember(); setStage((next + 3) % 3); };
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    if (scene.current) observer.observe(scene.current);
    const sync = () => setForeground(!document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, []);
  useEffect(() => {
    if (manual || reduced || !ready || !visible || !foreground || review) return;
    if (stage === 2) { remember(); return; }
    const timer = setTimeout(() => setStage(s => Math.min(s + 1, 2)), stage === 0 ? 1600 : 1800);
    return () => clearTimeout(timer);
  }, [manual, reduced, ready, visible, foreground, review, stage]);
  useEffect(() => { if (reduced && !manual) setStage(2); }, [reduced, manual]);
  return <section className="venue-hero" aria-label={pl ? "Cała hala, jeden koszyk" : "One food hall, one basket"}>
    <div className="venue-hero-copy">
      <p className="eyebrow venue-hero-context"><span className="green-dot" />HALA KOSZYKI<span aria-hidden="true">/</span><span>{pl ? "STOLIK" : "TABLE"} {table}</span></p>
      <h1><span>{pl ? "CAŁA HALA" : "ONE FOOD HALL"}</span><span>{pl ? "JEDEN KOSZYK" : "ONE BASKET"}</span></h1>
      <p className="venue-hero-intro">{pl ? "Burger z ATOM, frytki z The Fry, lody z Na końcu tęczy. Trzy kuchnie, jedna płatność." : "ATOM’s burger, The Fry’s fries, ice cream from Na końcu tęczy. Three kitchens, one payment."}</p>
      <div className="venue-hero-actions"><button className="primary" onClick={() => { setReview(true); setManual(true); remember(); }}>{pl ? "Zobacz ten zestaw" : "Explore this combo"}<ArrowRight size={19} /></button><button className="text-button" onClick={onBrowse}>{pl ? "Wszystkie kuchnie" : "All kitchens"}<ArrowRight size={16} /></button></div>
      <p className="venue-hero-promise"><Check size={14} />{pl ? "Zamów przy stoliku" : "Order from your seat"}<span aria-hidden="true">·</span>{pl ? "Odbierz przy ladach" : "Collect at the counters"}</p>
    </div>
    <div className="combo-stage" ref={scene} role="group" aria-label={pl ? "Złóż zestaw z trzech kuchni" : "Build a meal from three kitchens"}
      onClickCapture={e => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; } }}
      onPointerDown={e => { suppressClick.current = false; gesture.current = { x: e.clientX, y: e.clientY }; }}
      onPointerCancel={() => { gesture.current = null; }}
      onPointerUp={e => { const start = gesture.current; gesture.current = null; if (!start) return; const dx = e.clientX - start.x, dy = e.clientY - start.y; if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.4) { suppressClick.current = true; choose(stage + (dx < 0 ? 1 : -1)); } }}
      onKeyDown={e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); choose(stage + (e.key === "ArrowRight" ? 1 : -1)); } }}>
      <Suspense fallback={<div className="combo-motion"><img className="combo-still" src={"/assets/combo-stage-" + stage + ".webp"} alt="" /></div>}><ComboMotion stage={stage} active={visible && foreground && !review} reduced={reduced} onReady={markReady} /></Suspense>
      <div className="combo-vendors">{vendors.map((vendor, index) => {
        const delta = ((index - stage + 4) % 3) - 1, selected = index === stage;
        return <motion.button key={vendor.name} type="button" className={"combo-vendor-card" + (selected ? " is-active" : "")} aria-pressed={selected}
          aria-label={vendor.name + ": " + (pl ? vendor.pl : vendor.en) + (index <= stage ? (pl ? ", w podglądzie zestawu" : ", in the meal preview") : "")}
          initial={false} animate={{ x: (delta * 118) + "%", y: selected ? 13 : -1, rotate: delta * 10, scale: selected ? 1 : 0.88 }}
          transition={reduced ? { duration: 0 } : { duration: 0.7, ease: [0.22, 0.8, 0.2, 1] }}
          style={{ zIndex: selected ? 3 : 1 }} onClick={() => choose(index)}>
          <span className="combo-vendor-unit">{pl ? "LOKAL" : "COUNTER"} {vendor.unit}{index <= stage && <Check size={11} />}</span>
          <strong>{vendor.name}</strong><span className="combo-vendor-food">{pl ? vendor.pl : vendor.en}</span>
        </motion.button>;
      })}</div>
      <div className="combo-stage-footer"><span><b>{stage + 1}</b> {pl ? stage === 0 ? "kuchnia" : "kuchnie" : stage === 0 ? "kitchen" : "kitchens"}<span className="combo-separator">/</span>{pl ? "jeden koszyk" : "one basket"}</span><span className="combo-swipe"><MoveHorizontal size={16} />{pl ? "Przesuń" : "Swipe"}</span></div>
    </div>
    {review && <ComboReview locale={locale} cart={cart} onClose={() => setReview(false)} onConfirm={items => { setReview(false); onAddCombo(items); }} />}
  </section>;
}
