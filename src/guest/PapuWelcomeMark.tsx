import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import PapayaMark from "./PapayaMark";
import "./papu-welcome.css";

const GuestAnimation = lazy(() =>
  import("../GuestAnimation").catch(() => ({ default: () => <></> })),
);

export default function PapuWelcomeMark({ eligible }: { eligible: boolean }) {
  const [phase, setPhase] = useState<"loading" | "playing" | "done">(() =>
    eligible && !document.hidden && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "loading"
      : "done",
  );
  const finish = useCallback(() => setPhase("done"), []);
  const start = useCallback(() => setPhase((p) => p === "loading" ? "playing" : p), []);

  useEffect(() => {
    if (!eligible || phase === "done") {
      finish();
      return;
    }
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stopWhenHidden = () => {
      if (preference.matches || document.hidden) finish();
    };
    stopWhenHidden();
    preference.addEventListener("change", stopWhenHidden);
    document.addEventListener("visibilitychange", stopWhenHidden);
    const timeout = phase === "loading" ? window.setTimeout(finish, 1200) : undefined;
    return () => {
      window.clearTimeout(timeout);
      preference.removeEventListener("change", stopWhenHidden);
      document.removeEventListener("visibilitychange", stopWhenHidden);
    };
  }, [eligible, finish, phase]);

  return (
    <span className="papu-welcome" data-playing={eligible && phase === "playing"} aria-hidden="true">
      <PapayaMark className="papu-footer-fruit" />
      {eligible && phase !== "done" && (
        <span className="papu-welcome-art">
          <Suspense fallback={null}>
            <GuestAnimation src="/assets/sweeto/sweeto-pass.riv" artboard="SweetoPass"
              stateMachine="PapuPay Welcome" durationMs={1020} onStart={start} onFinish={finish} />
          </Suspense>
        </span>
      )}
    </span>
  );
}
