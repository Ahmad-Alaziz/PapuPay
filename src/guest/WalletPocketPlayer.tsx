import {
  Alignment,
  Fit,
  Layout,
  RuntimeLoader,
  useRive,
} from "@rive-app/react-canvas";
import { useEffect, useRef } from "react";

RuntimeLoader.setWasmUrl("/assets/rive.wasm");
const layout = new Layout({ fit: Fit.Contain, alignment: Alignment.Center });

export default function WalletPocketPlayer({ handoff }: { handoff: boolean }) {
  const { rive, setCanvasRef, setContainerRef } = useRive({
    src: "/assets/wallet-pocket.riv",
    artboard: "Pocket",
    stateMachine: "Preview",
    autoplay: false,
    enableRiveAssetCDN: false,
    shouldDisableRiveListeners: true,
    layout,
  });
  const player = useRef<HTMLSpanElement>(null);
  const previous = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (!rive || !player.current) return;
    // Keep the tucked pose when the host clears its short-lived handoff feedback.
    const shouldPlay = previous.current === undefined || handoff;
    previous.current = handoff;
    if (!shouldPlay || document.hidden) return;
    rive.reset({
      artboard: "Pocket",
      stateMachine: handoff ? "Handoff" : "Preview",
      autoplay: true,
    });
    rive.drawFrame();
    player.current.dataset.ready = "true";
  }, [handoff, rive]);

  return (
    <span ref={player} className="papu-wallet-pocket-layer">
      <span ref={setContainerRef}>
        <canvas ref={setCanvasRef} />
      </span>
    </span>
  );
}
