import { useEffect, useRef, useState } from "react";
import { useRive, Layout, Fit, Alignment, RuntimeLoader } from "@rive-app/react-canvas";
import MealStill from "./MealStill";

RuntimeLoader.setWasmUrl("/assets/rive.wasm");
export default function MealMotion({ stage, active, reduced, onReady }: { stage: number; active: boolean; reduced: boolean; onReady: () => void }) {
  useEffect(() => { if (reduced) onReady(); }, [reduced, onReady]);
  return reduced ? <MealStill stage={stage} /> : <AnimatedMeal stage={stage} active={active} onReady={onReady} />;
}
function AnimatedMeal({ stage, active, onReady }: { stage: number; active: boolean; onReady: () => void }) {
  const [failed, setFailed] = useState(false), [painted, setPainted] = useState(false);
  const initialized = useRef(false), host = useRef<HTMLDivElement>(null);
  const { rive, RiveComponent } = useRive({
    src: "/assets/papu-meal.riv", artboard: "PapuCombo", stateMachine: "PapuCombo", autoBind: true, autoplay: false,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }), onLoadError: () => setFailed(true),
  });
  useEffect(() => { if (rive || failed) onReady(); }, [rive, failed, onReady]);
  useEffect(() => {
    const value = rive?.viewModelInstance?.number("stage");
    if (value) value.value = stage;
    if (!rive || !active) { rive?.pause(); return; }
    rive.play();
    const reveal = initialized.current ? undefined : setTimeout(() => { initialized.current = true; setPainted(true); }, 800);
    const stop = setTimeout(() => rive.pause(), 1100);
    return () => { clearTimeout(stop); if (reveal) clearTimeout(reveal); };
  }, [rive, stage, active]);
  useEffect(() => {
    if (!rive || !host.current) return;
    let frame = 0;
    const observer = new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { rive.resizeDrawingSurfaceToCanvas(); rive.resizeToCanvas(); rive.drawFrame(); }); });
    observer.observe(host.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [rive]);
  useEffect(() => () => rive?.pause(), [rive]);
  return <div className="meal-motion" ref={host} aria-hidden="true">
    <div style={{ opacity: painted && !failed ? 0 : 1 }}><MealStill stage={stage} /></div>
    {!failed && <div className={painted ? "meal-canvas ready" : "meal-canvas"}><RiveComponent /></div>}
  </div>;
}
