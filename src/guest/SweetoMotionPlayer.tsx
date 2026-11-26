import {
  Alignment,
  Fit,
  Layout,
  RuntimeLoader,
  useRive,
} from "@rive-app/react-canvas";
import { useEffect, useState } from "react";
import type { SweetoMotionKind, SweetoMotionTheme } from "./SweetoMotion";

RuntimeLoader.setWasmUrl("/assets/rive.wasm");

const layout = new Layout({ fit: Fit.Contain, alignment: Alignment.Center });
const sequences = {
  menu: { artboard: "SweetoMenu", duration: 717 },
  loyalty: { artboard: "SweetoLoyalty", duration: 834 },
  review: { artboard: "SweetoReview", duration: 784 },
  wifi: { artboard: "SweetoWifi", duration: 717 },
};

let sharedFile: Promise<ArrayBuffer> | undefined;

function actionFile() {
  if (sharedFile) return sharedFile;
  sharedFile = fetch("/assets/sweeto/sweeto-actions.riv")
    .then((response) => {
      if (!response.ok)
        throw new Error("Sweeto motion asset could not be loaded");
      return response.arrayBuffer();
    })
    .catch((error) => {
      sharedFile = undefined;
      throw error;
    });
  return sharedFile;
}

export default function SweetoMotionPlayer({
  kind,
  theme,
  onStart,
  onFinish,
}: {
  kind: SweetoMotionKind;
  theme: SweetoMotionTheme;
  onStart: () => void;
  onFinish: () => void;
}) {
  const [file, setFile] = useState<ArrayBuffer>();
  const [visible, setVisible] = useState(false);
  const { artboard, duration } = sequences[kind];
  const canvasLimit = window.matchMedia("(pointer: coarse)").matches ? 1.5 : 2;
  const { rive, setCanvasRef, setContainerRef } = useRive(
    file
      ? {
          buffer: file,
          artboard,
          stateMachine: "Gesture",
          autoplay: false,
          layout,
          shouldDisableRiveListeners: true,
          enableRiveAssetCDN: false,
          onLoadError: onFinish,
        }
      : null,
    {
      customDevicePixelRatio: Math.min(
        window.devicePixelRatio || 1,
        canvasLimit,
      ),
    },
  );

  useEffect(() => {
    let alive = true;
    void actionFile().then(
      (result) => {
        if (alive) setFile(result);
      },
      () => {
        if (alive) onFinish();
      },
    );
    return () => {
      alive = false;
    };
  }, [onFinish]);

  useEffect(() => {
    if (!rive) return;
    let end: number | undefined;
    const frame = requestAnimationFrame(() => {
      if (document.hidden) {
        onFinish();
        return;
      }
      const palette = rive
        .viewModelByName("VenuePalette")
        ?.instanceByName(theme);
      if (!palette) {
        onFinish();
        return;
      }
      rive.bindViewModelInstance(palette);
      rive.play();
      rive.drawFrame();
      setVisible(true);
      onStart();
      end = window.setTimeout(onFinish, duration + 45);
    });
    const onVisibility = () => {
      if (document.hidden) onFinish();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(end);
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [duration, onFinish, onStart, rive, theme]);

  return (
    <span
      ref={setContainerRef}
      style={{ position: "absolute", inset: 0, opacity: visible ? 1 : 0 }}
    >
      <canvas
        ref={setCanvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </span>
  );
}
