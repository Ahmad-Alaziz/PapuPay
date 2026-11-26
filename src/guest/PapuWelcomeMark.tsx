import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import PapayaMark from "./PapayaMark";
import "./papu-welcome.css";

const GuestAnimation = lazy(() =>
  import("../GuestAnimation").catch(() => ({ default: () => <></> })),
);

export default function PapuWelcomeMark({ eligible }: { eligible: boolean }) {
  const marker = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<"waiting" | "loading" | "playing" | "done">(() =>
    eligible && !document.hidden && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "waiting"
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
    const observer = phase === "waiting" && marker.current
      ? new IntersectionObserver(([entry]) => {
          if (entry?.isIntersecting) setPhase("loading");
        })
      : undefined;
    if (observer && marker.current) observer.observe(marker.current);
    preference.addEventListener("change", stopWhenHidden);
    document.addEventListener("visibilitychange", stopWhenHidden);
    const timeout = phase === "loading" ? window.setTimeout(finish, 1200) : undefined;
    return () => {
      window.clearTimeout(timeout);
      observer?.disconnect();
      preference.removeEventListener("change", stopWhenHidden);
      document.removeEventListener("visibilitychange", stopWhenHidden);
    };
  }, [eligible, finish, phase]);

  return (
    <span ref={marker} className="papu-welcome" data-playing={eligible && phase === "playing"} aria-hidden="true">
      <PapayaMark className="papu-footer-fruit" />
      {eligible && (phase === "loading" || phase === "playing") && (
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
