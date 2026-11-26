import {
  Alignment,
  Fit,
  Layout,
  RuntimeLoader,
  useRive,
} from "@rive-app/react-canvas";
import { useEffect, useState } from "react";

RuntimeLoader.setWasmUrl("/assets/rive.wasm");

const layout = new Layout({ fit: Fit.Contain, alignment: Alignment.Center });
interface GuestAnimationProps {
  src: string;
  artboard: string;
  stateMachine: string;
  durationMs: number;
  allowVerticalOverflow?: boolean;
  readyToStart?: boolean;
  onStart: () => void;
  onFinish: () => void;
  onError?: () => void;
}

export default function GuestAnimation({
  src,
  artboard,
  stateMachine,
  durationMs,
  allowVerticalOverflow = false,
  readyToStart = true,
  onStart,
  onFinish,
  onError,
}: GuestAnimationProps) {
  const [started, setStarted] = useState(false);
  const { rive, setCanvasRef, setContainerRef } = useRive({
    src,
    artboard,
    stateMachine,
    autoplay: false,
    enableRiveAssetCDN: false,
    isTouchScrollEnabled: false,
    layout,
    onLoadError: onError ?? onFinish,
  });

  useEffect(() => {
    if (!rive || !readyToStart) return;
    if (document.hidden) {
      onFinish();
      return;
    }

    let end: number | undefined;
    const start = requestAnimationFrame(() => {
      rive.play();
      rive.drawFrame();
      setStarted(true);
      onStart();
      end = window.setTimeout(onFinish, durationMs);
    });
    const finishWhenHidden = () => {
      if (document.hidden) onFinish();
    };
    document.addEventListener("visibilitychange", finishWhenHidden);
    return () => {
      cancelAnimationFrame(start);
      clearTimeout(end);
      document.removeEventListener("visibilitychange", finishWhenHidden);
    };
  }, [durationMs, readyToStart, rive, onStart, onFinish]);

  return (
    <span
      ref={setContainerRef}
      // Extra drawing space contains the approach above the artboard.
      // Fit.Contain preserves the seal's horizontal scale and optical center.
      style={{
        position: "absolute",
        inset: allowVerticalOverflow ? "-50% 0" : 0,
        pointerEvents: "none",
        opacity: started ? 1 : 0,
      }}
    >
      <canvas
        ref={setCanvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </span>
  );
}
