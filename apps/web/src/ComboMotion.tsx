import { useEffect, useRef, useState } from "react";
import { useRive, Layout, Fit, Alignment, RuntimeLoader } from "@rive-app/react-canvas";

RuntimeLoader.setWasmUrl("/assets/rive.wasm");

export default function ComboMotion({ stage, active, reduced, onReady }: {
  stage: number; active: boolean; reduced: boolean; onReady: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const [painted, setPainted] = useState(false);
  const initialized = useRef(false);
  const host = useRef<HTMLDivElement>(null);
  const { rive, RiveComponent } = useRive({
    src: "/assets/papu-combo.riv",
    artboard: "PapuCombo",
    stateMachine: "PapuCombo",
    autoBind: true,
    autoplay: false,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoadError: () => setFailed(true),
  });
  useEffect(() => { if (rive || failed) onReady(); }, [rive, failed, onReady]);
  useEffect(() => {
    const value = rive?.viewModelInstance?.number("stage");
    if (value) value.value = stage;
    if (!rive || reduced || !active) { rive?.pause(); return; }
    rive.play();
    // The authored transition takes 700 ms. Resting poses need no render loop.
    const reveal = initialized.current ? undefined : setTimeout(() => {
      initialized.current = true;
      setPainted(true);
    }, stage === 0 ? 100 : 760);
    const stop = setTimeout(() => rive.pause(), 950);
    return () => { clearTimeout(stop); if (reveal) clearTimeout(reveal); };
  }, [rive, stage, active, reduced]);
  useEffect(() => {
    if (!rive || !host.current) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        rive.resizeDrawingSurfaceToCanvas();
        rive.resizeToCanvas();
        rive.drawFrame();
      });
    });
    observer.observe(host.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [rive]);
  useEffect(() => () => rive?.pause(), [rive]);
  return <div className="combo-motion" ref={host} aria-hidden="true">
    <img className="combo-still" src={"/assets/combo-stage-" + stage + ".webp"} alt="" />
    {!failed && !reduced && <div className={painted ? "combo-canvas ready" : "combo-canvas"}><RiveComponent /></div>}
  </div>;
}
