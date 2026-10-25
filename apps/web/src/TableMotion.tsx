import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Alignment,
  Fit,
  Layout,
  RuntimeLoader,
  useRive,
} from "@rive-app/react-canvas";

RuntimeLoader.setWasmUrl("/assets/rive.wasm");

/** A decorative, one-shot shared-table arrival that settles without an idle loop. */
export default function TableMotion({ fallback }: { fallback: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [resizeVersion, setResizeVersion] = useState(0);
  const { RiveComponent, rive } = useRive({
    src: "/assets/table.riv",
    artboard: "PapuTable",
    stateMachine: "PapuTable",
    autoBind: true,
    autoplay: false,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoad: () => setLoaded(true),
    onLoadError: () => setFailed(true),
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.08 },
    );
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!rive) return;
    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // A paused Rive canvas needs both a resized surface and one fresh render.
        rive.resizeDrawingSurfaceToCanvas();
        setResizeVersion((version) => version + 1);
      });
    };
    const observer = new ResizeObserver(resize);
    if (host.current) observer.observe(host.current);
    window.addEventListener("resize", resize);
    resize();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [rive]);
  useEffect(() => {
    const selection = rive?.viewModelInstance?.number("selected");
    if (selection) selection.value = 0;
  }, [rive]);
  useEffect(() => {
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      clearTimeout(settleTimer);
      if (loaded && visible && !document.hidden && !failed) {
        rive?.play();
        // The arrival settles. An idle hero does no render work.
        settleTimer = setTimeout(() => rive?.pause(), 2000);
      } else rive?.pause();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearTimeout(settleTimer);
      document.removeEventListener("visibilitychange", sync);
      rive?.pause();
    };
  }, [rive, loaded, visible, failed, resizeVersion]);

  return (
    <div className="table-rive" ref={host} aria-hidden="true">
      <div
        className={`table-rive-fallback ${loaded && !failed ? "is-hidden" : ""}`}
      >
        {fallback}
      </div>
      {!failed && (
        <div className={`table-rive-canvas ${loaded ? "is-ready" : ""}`}>
          <RiveComponent />
        </div>
      )}
    </div>
  );
}
