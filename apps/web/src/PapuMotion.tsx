import { useEffect, useState } from "react";
import {
  useRive,
  useStateMachineInput,
  Layout,
  Fit,
  Alignment,
  RuntimeLoader,
} from "@rive-app/react-canvas";
RuntimeLoader.setWasmUrl("/assets/rive.wasm");

export default function PapuMotion({
  celebrate = false,
  scan = false,
}: {
  celebrate?: boolean;
  scan?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const { RiveComponent, rive } = useRive({
    src: "/assets/papu.riv",
    stateMachine: "Papu",
    autoplay: !reduced,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoadError: () => setFailed(true),
  });
  const trigger = useStateMachineInput(rive, "Papu", "Celebrate");
  const scanTrigger = useStateMachineInput(rive, "Papu", "Scan");
  useEffect(() => {
    if (reduced) {
      rive?.pause();
      return;
    }
    rive?.play();
    const timer = window.setTimeout(() => {
      if (scan) scanTrigger?.fire();
      else if (celebrate) trigger?.fire();
    }, 300);
    return () => clearTimeout(timer);
  }, [celebrate, scan, reduced, trigger, scanTrigger, rive]);
  return (
    <div className="papu-motion" aria-hidden="true">
      {failed || reduced ? (
        <img src="/assets/papaya-3d.webp" alt="" />
      ) : (
        <RiveComponent />
      )}
    </div>
  );
}
