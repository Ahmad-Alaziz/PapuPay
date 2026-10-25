import { useEffect, useRef, useState } from "react";
import {
  useRive,
  Layout,
  Fit,
  Alignment,
  RuntimeLoader,
} from "@rive-app/react-canvas";
RuntimeLoader.setWasmUrl("/assets/rive.wasm");

export default function PapuMotion({
  celebrate = false,
  scan = false,
  scene,
}: {
  celebrate?: boolean;
  scan?: boolean;
  scene?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [visible, setVisible] = useState(true);
  const selectedScene = scene ?? (scan ? 1 : celebrate ? 4 : 0);
  const { RiveComponent, rive } = useRive({
    src: "/assets/papu.riv",
    stateMachine: "Papu",
    autoplay: !reduced,
    autoBind: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoadError: () => setFailed(true),
  });
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    if (host.current) observer.observe(host.current);
    return () => {
      media.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    const value = rive?.viewModelInstance?.number("scene");
    if (value) value.value = selectedScene;
  }, [rive, selectedScene]);
  useEffect(() => {
    const sync = () => {
      if (reduced || !visible || document.hidden) rive?.pause();
      else rive?.play();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [rive, visible, reduced]);
  return (
    <div ref={host} className="papu-motion" aria-hidden="true">
      {failed || reduced ? (
        <img src="/assets/papaya-3d.webp" alt="" />
      ) : (
        <RiveComponent />
      )}
    </div>
  );
}
