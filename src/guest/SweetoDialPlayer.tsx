import {
  Alignment,
  Fit,
  Layout,
  RuntimeLoader,
  useRive,
} from "@rive-app/react-canvas";
import { useLayoutEffect, useState } from "react";

RuntimeLoader.setWasmUrl("/assets/rive.wasm");

const layout = new Layout({ fit: Fit.Contain, alignment: Alignment.Center });

export default function SweetoDialPlayer({
  angle,
  pressure,
}: {
  angle: number;
  pressure: number;
}) {
  const [ready, setReady] = useState(false);
  const { rive, setCanvasRef, setContainerRef } = useRive({
    src: "/assets/sweeto/sweeto-tasting-dial.riv",
    artboard: "Sweeto Tasting Dial",
    stateMachines: "State Machine 1",
    layout,
    autoBind: true,
    autoplay: true,
    shouldDisableRiveListeners: true,
    enableRiveAssetCDN: false,
  });

  useLayoutEffect(() => {
    const turn = rive?.viewModelInstance?.number("Turn");
    const press = rive?.viewModelInstance?.number("Press");
    if (!rive || !turn || !press) return;
    turn.value = angle;
    press.value = pressure;
    rive.drawFrame();
    setReady(true);
  }, [angle, pressure, rive]);

  return (
    <span
      ref={setContainerRef}
      className="papu-tasting-rive"
      data-ready={ready}
    >
      <canvas ref={setCanvasRef} />
    </span>
  );
}
