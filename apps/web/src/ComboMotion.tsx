import { useEffect, useRef, useState } from "react";
import { useRive, Layout, Fit, Alignment, RuntimeLoader } from "@rive-app/react-canvas";
import layout from "../../../packages/motion/combo/fallback-layout.json";

RuntimeLoader.setWasmUrl("/assets/rive.wasm");
export default function ComboMotion({ stage, direction, active, reduced, onReady }: {
  stage: number; direction: number; active: boolean; reduced: boolean; onReady: () => void;
}) {
  const [failed, setFailed] = useState(false), [painted, setPainted] = useState(false);
  const initialized = useRef(false), host = useRef<HTMLDivElement>(null);
  const { rive, RiveComponent } = useRive({
    src: "/assets/papu-carousel.riv", artboard: "PapuCombo", stateMachine: "PapuCombo", autoBind: true, autoplay: false,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }), onLoadError: () => setFailed(true),
  });
  useEffect(() => { if (rive || failed) onReady(); }, [rive, failed, onReady]);
  useEffect(() => {
    const directionValue = rive?.viewModelInstance?.number("direction"), value = rive?.viewModelInstance?.number("stage");
    if (directionValue) directionValue.value = direction;
    if (value) value.value = stage;
    if (!rive || reduced || !active) { rive?.pause(); return; }
    rive.play();
    const reveal = initialized.current ? undefined : setTimeout(() => { initialized.current = true; setPainted(true); }, 780);
    const stop = setTimeout(() => rive.pause(), 1100);
    return () => { clearTimeout(stop); if (reveal) clearTimeout(reveal); };
  }, [rive, stage, direction, active, reduced]);
  useEffect(() => {
    if (!rive || !host.current) return;
    let frame = 0;
    const observer = new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { rive.resizeDrawingSurfaceToCanvas(); rive.resizeToCanvas(); rive.drawFrame(); }); });
    observer.observe(host.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [rive]);
  useEffect(() => () => rive?.pause(), [rive]);
  const f = layout.foods[stage];
  return <div className="carousel-motion" ref={host} aria-hidden="true">
    <div className="carousel-food-still" style={{ opacity: painted && !failed && !reduced ? 0 : 1 }}><img src={"/assets/carousel-" + f.file + ".webp"} alt="" style={{ width: `${f.imageWidth / 720 * 100}%`, height: `${f.imageHeight / 640 * 100}%`, left: `${f.centerX / 720 * 100}%`, top: `${f.centerY / 640 * 100}%` }} /></div>
    {!failed && !reduced && <div className={painted ? "carousel-canvas ready" : "carousel-canvas"}><RiveComponent /></div>}
  </div>;
}
