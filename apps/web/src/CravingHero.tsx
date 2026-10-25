import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { ArrowLeft, ArrowRight, MoveHorizontal, Pause, Play, Layers3 } from "lucide-react";
import ComboReview from "./ComboReview";
import type { ComboSelection } from "./ComboReview";
import { restaurants, menu, type CartLine, type Locale } from "./domain";
import layout from "../../../packages/motion/combo/fallback-layout.json";
import "./table-hero.css";

const ComboMotion = lazy(() => import("./ComboMotion").catch(() => ({ default: function Still({ stage, onReady }: { stage: number; onReady: () => void }) {
  useEffect(onReady, [onReady]); return <FoodStill stage={stage} />;
} })));
const count = layout.foods.length;
const wrap = (n: number) => ((n % count) + count) % count;
const distance = (n: number) => wrap(n + count / 2) - count / 2;
const vendors = layout.foods.map(food => ({ ...food, restaurant: restaurants.find(r => r.id === food.vendorId)!, dish: menu.find(d => d.restaurantId === food.vendorId)! }));
export function FoodStill({ stage }: { stage: number }) {
  const f = layout.foods[stage];
  return <div className="carousel-food-still" aria-hidden="true"><img src={"/assets/carousel-" + f.file + ".webp"} alt="" style={{ width: `${f.imageWidth / 720 * 100}%`, height: `${f.imageHeight / 640 * 100}%`, left: `${f.centerX / 720 * 100}%`, top: `${f.centerY / 640 * 100}%` }} /></div>;
}
function VendorWindow({ index, phase, width, selected, pl, onChoose }: { index: number; phase: MotionValue<number>; width: number; selected: number; pl: boolean; onChoose: () => void }) {
  const vendor = vendors[index];
  const delta = useTransform(phase, value => distance(index - value));
  const x = useTransform(delta, value => value * width * (width < 600 ? .36 : .255));
  const y = useTransform(delta, value => Math.pow(Math.abs(value), 1.65) * (width < 600 ? 20 : 28));
  const rotate = useTransform(delta, value => value * 13);
  const scale = useTransform(delta, value => Math.max(.64, 1 - Math.abs(value) * .10));
  const opacity = useTransform(delta, value => Math.min(1, Math.abs(value) * 1.6, Math.max(0, (3.1 - Math.abs(value)) * 2)));
  const hidden = index === selected || Math.abs(distance(index - selected)) > 2;
  return <motion.button type="button" className="vendor-window" style={{ x, y, rotate, scale, opacity }}
    aria-label={(pl ? "Pokaż " : "Preview ") + vendor.restaurant.name} aria-hidden={hidden} tabIndex={hidden ? -1 : 0} onClick={onChoose}>
    <span className="vendor-window-number">{pl ? "LOKAL" : "COUNTER"} {String(vendor.restaurant.unit).padStart(2, "0")}</span>
    <img src={"/assets/carousel-" + vendor.file + ".webp"} alt="" draggable="false" />
    <strong>{vendor.restaurant.name}</strong>
  </motion.button>;
}

export default function CravingHero({ locale, table, cart, onBrowse, onVendor, onAddCombo }: {
  locale: Locale; table: string; cart: CartLine[]; onBrowse: () => void; onVendor: (id: string) => void; onAddCombo: (items: ComboSelection[]) => void;
}) {
  const reduced = !!useReducedMotion(), pl = locale === "pl";
  const [cursor, setCursor] = useState(0), [direction, setDirection] = useState(1), [revision, setRevision] = useState(0);
  const [manual, setManual] = useState(false), [ready, setReady] = useState(false), [sequence, setSequence] = useState(0);
  const [visible, setVisible] = useState(false), [foreground, setForeground] = useState(!document.hidden), [review, setReview] = useState(false);
  const [width, setWidth] = useState(720);
  const autoplayOrigin = useRef(0), focusSelection = useRef(false), menuAction = useRef<HTMLButtonElement>(null);
  const scene = useRef<HTMLDivElement>(null), phase = useMotionValue(0);
  const transport = useRef<{ stop: () => void } | null>(null);
  const gesture = useRef<{ x: number; y: number; phase: number; dragging: boolean } | null>(null), suppressClick = useRef(false);
  const stage = wrap(cursor), selected = vendors[stage], active = visible && foreground && !review;
  const markReady = useCallback(() => setReady(true), []);
  const select = (next: number, byHand = true, travelDirection?: number) => {
    if (byHand) setManual(true);
    setDirection(travelDirection ?? (next >= cursor ? 1 : -1));
    setCursor(next); setRevision(n => n + 1);
  };
  const step = (offset: number) => select(Math.round(phase.get()) + offset);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .25 });
    const resize = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    if (scene.current) { observer.observe(scene.current); resize.observe(scene.current); }
    const sync = () => setForeground(!document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => { observer.disconnect(); resize.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, []);
  useEffect(() => {
    transport.current?.stop();
    if (reduced || !active) { phase.set(cursor); return; }
    const travel = Math.abs(cursor - phase.get());
    transport.current = animate(phase, cursor, { duration: Math.min(1.7, .65 + travel * .3), ease: [.22, .8, .2, 1] });
    return () => transport.current?.stop();
  }, [cursor, revision, phase, reduced, active]);
  useEffect(() => {
    if (manual || reduced || !ready || !active) return;
    const destinations = [-1, 2, 0];
    const timer = setTimeout(() => {
      const next = autoplayOrigin.current + destinations[sequence % destinations.length];
      setDirection(next >= phase.get() ? 1 : -1); setCursor(next); setRevision(n => n + 1); setSequence(n => n + 1);
    }, sequence === 0 ? 2100 : sequence % 3 === 0 ? 5700 : 4000);
    return () => clearTimeout(timer);
  }, [manual, reduced, ready, active, sequence, phase]);

  return <section className="venue-hero" aria-label={pl ? "Cała hala, jeden koszyk" : "One food hall, one basket"}>
    <div className="venue-hero-copy">
      <div><p className="eyebrow venue-hero-context"><span className="green-dot" />HALA KOSZYKI<span>/</span>{pl ? "STOLIK" : "TABLE"} {table}</p>
        <h1><span>{pl ? "CAŁA HALA" : "ONE FOOD HALL"}</span><span>{pl ? "JEDEN KOSZYK" : "ONE BASKET"}</span></h1></div>
      <p className="venue-hero-intro">{pl ? "Na co masz ochotę? Przejrzyj kuchnie, połącz ulubione smaki i zapłać raz." : "What takes your fancy? Explore the kitchens, mix your favourites and pay once."}</p>
    </div>
    <div className="carousel-stage" ref={scene} role="group" aria-label={pl ? "Karuzela kuchni Hali Koszyki" : "Hala Koszyki kitchen carousel"}
      onClickCapture={e => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; } }}
      onPointerDown={e => { suppressClick.current = false; gesture.current = { x: e.clientX, y: e.clientY, phase: phase.get(), dragging: false }; }}
      onPointerMove={e => { const g = gesture.current; if (!g) return; const dx = e.clientX - g.x, dy = e.clientY - g.y; if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.25) { g.dragging = true; setManual(true); transport.current?.stop(); e.currentTarget.setPointerCapture(e.pointerId); phase.set(g.phase - dx / (width * (width < 600 ? .36 : .255))); } }}
      onPointerCancel={() => { gesture.current = null; setRevision(n => n + 1); }}
      onPointerUp={e => { const g = gesture.current; gesture.current = null; if (!g?.dragging) return; suppressClick.current = true; const delta = phase.get() - g.phase; const next = Math.abs(delta) > .2 ? Math.round(g.phase) + Math.sign(delta) * Math.max(1, Math.round(Math.abs(delta))) : Math.round(g.phase); select(next, true, Math.sign(delta) || direction); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
      onFocusCapture={e => { if (!(e.target as HTMLElement).closest(".carousel-play")) setManual(true); }}
      onKeyDown={e => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); step(e.key === "ArrowRight" ? 1 : -1); } }}>
      <div className="carousel-utility"><span>{pl ? "10 KUCHNI · TWÓJ WYBÓR" : "10 KITCHENS · YOUR PICK"}</span><button className="carousel-play" aria-label={manual ? (pl ? "Wznów animację" : "Resume animation") : (pl ? "Wstrzymaj animację" : "Pause animation")} onClick={() => { if (manual) { autoplayOrigin.current = Math.round(phase.get()); select(autoplayOrigin.current, false); setSequence(0); setManual(false); } else setManual(true); }}>{manual ? <Play size={13} /> : <Pause size={13} />}</button></div>
      <div className="carousel-ground" aria-hidden="true" />
      <div className="carousel-windows">{vendors.map((vendor, index) => <VendorWindow key={vendor.vendorId} index={index} phase={phase} width={width} selected={stage} pl={pl} onChoose={() => { focusSelection.current = true; select(Math.round(phase.get()) + distance(index - Math.round(phase.get()))); }} />)}</div>
      <div className="carousel-food"><Suspense fallback={<FoodStill stage={stage} />}><ComboMotion stage={stage} direction={direction} active={active} reduced={reduced} onReady={markReady} /></Suspense></div>
      <div className="carousel-selection">
        <button className="carousel-arrow" aria-label={pl ? "Poprzednia kuchnia" : "Previous kitchen"} onClick={() => step(-1)}><ArrowLeft size={20} /></button>
        <div className="carousel-caption" aria-live={manual ? "polite" : "off"}><AnimatePresence initial={false} mode="wait"><motion.div key={stage} onAnimationComplete={definition => { if (typeof definition === "object" && "opacity" in definition && definition.opacity === 1 && focusSelection.current) { menuAction.current?.focus(); focusSelection.current = false; } }} initial={{ opacity: 0, y: reduced ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -8 }} transition={{ duration: reduced ? 0 : .2 }}>
          <small>{pl ? "LOKAL" : "COUNTER"} {String(selected.restaurant.unit).padStart(2, "0")}<span> / </span>{String(stage + 1).padStart(2, "0")}—10</small>
          <strong>{selected.restaurant.name}</strong><button ref={menuAction} className="carousel-menu" onClick={() => { setManual(true); onVendor(selected.vendorId); }}>{pl ? "Zobacz menu" : "Explore the menu"}<ArrowRight size={16} /></button>
        </motion.div></AnimatePresence></div>
        <button className="carousel-arrow" aria-label={pl ? "Następna kuchnia" : "Next kitchen"} onClick={() => step(1)}><ArrowRight size={20} /></button>
      </div>
      <div className="carousel-hint"><MoveHorizontal size={14} />{pl ? "Przesuń i odkrywaj" : "Swipe to explore"}</div>
    </div>
    <div className="venue-hero-footer"><button className="combo-invitation" onClick={() => { setManual(true); setReview(true); }}><Layers3 size={18} /><span>{pl ? "Burger + frytki + lody" : "Burger + fries + ice cream"}<small>{pl ? "Połącz trzy kuchnie" : "Build a three-kitchen combo"}</small></span><ArrowRight size={18} /></button><button className="text-button" onClick={onBrowse}>{pl ? "Wszystkie kuchnie" : "All kitchens"}<ArrowRight size={16} /></button></div>
    {review && <ComboReview locale={locale} cart={cart} onClose={() => setReview(false)} onConfirm={items => { setReview(false); onAddCombo(items); }} />}
  </section>;
}
