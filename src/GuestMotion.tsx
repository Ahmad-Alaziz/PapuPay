import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useVenue } from "./guest/VenueContext";

const GuestAnimation = lazy(() =>
  import("./GuestAnimation").catch(() => ({ default: () => <></> })),
);
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const sweetoStamp = {
  src: "/assets/sweeto/sweeto-imprint-web.riv",
  poster: "/assets/sweeto/sweeto-pass.webp",
  artboard: "SweetoPass",
  stateMachine: "State Machine 1",
  durationMs: 900,
};
const guestStamp = {
  src: "/assets/guest-feedback.riv",
  poster: "/assets/guest-loyalty-seal.webp",
  artboard: "LoyaltySeal",
  stateMachine: "Feedback",
  durationMs: 630,
};

function subscribeToMotionPreference(update: () => void) {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}

function prefersReducedMotion() {
  return window.matchMedia(reducedMotionQuery).matches;
}

function subscribeToVisibilityAndMotion(update: () => void) {
  const unsubscribe = subscribeToMotionPreference(update);
  document.addEventListener("visibilitychange", update);
  return () => {
    unsubscribe();
    document.removeEventListener("visibilitychange", update);
  };
}
function needsStillImprint() {
  return document.hidden || prefersReducedMotion();
}

function MotionStill({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

function SweetoImprint() {
  const staticOnly = useSyncExternalStore(
    subscribeToVisibilityAndMotion,
    needsStillImprint,
    () => true,
  );
  const [phase, setPhase] = useState<"waiting" | "rive" | "press" | "done">(
    "waiting",
  );
  const [readyToStart, setReadyToStart] = useState(false);
  const start = useCallback(
    () => setPhase((p) => (p === "waiting" ? "rive" : p)),
    [],
  );
  const press = useCallback(
    () => setPhase((p) => (p === "waiting" ? "press" : p)),
    [],
  );
  const finish = useCallback(() => setPhase("done"), []);
  const { poster, ...runtime } = sweetoStamp;
  const still = <MotionStill src={poster} />;

  useEffect(() => {
    if (staticOnly) {
      finish();
      return;
    }
    const finalImage = new Image();
    finalImage.src = sweetoStamp.poster;
    const guide = window.setTimeout(() => setReadyToStart(true), 220);
    const deadline = window.setTimeout(press, 540);
    return () => {
      clearTimeout(guide);
      clearTimeout(deadline);
    };
  }, [staticOnly, press, finish]);

  useEffect(() => {
    if (phase !== "press" || !readyToStart) return;
    const timeout = window.setTimeout(finish, 540);
    return () => window.clearTimeout(timeout);
  }, [phase, readyToStart, finish]);

  if (staticOnly || phase === "done") return still;
  return (
    <>
      {(phase === "waiting" || (phase === "press" && !readyToStart)) && (
        <span className="papu-imprint-guide" />
      )}
      {phase === "press" ? (
        readyToStart && <span className="papu-imprint-press">{still}</span>
      ) : (
        <Suspense fallback={null}>
          <GuestAnimation
            {...runtime}
            allowVerticalOverflow
            readyToStart={readyToStart}
            onStart={start}
            onFinish={finish}
            onError={press}
          />
        </Suspense>
      )}
    </>
  );
}

function MotionPlayback({ animation }: { animation: typeof sweetoStamp }) {
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    prefersReducedMotion,
    () => true,
  );
  const [phase, setPhase] = useState<"loading" | "playing" | "done">("loading");
  const start = useCallback(() => setPhase("playing"), []);
  const finish = useCallback(() => setPhase("done"), []);
  const { poster, ...runtime } = animation;
  const still = <MotionStill src={poster} />;

  useEffect(() => {
    if (reducedMotion) {
      finish();
      return;
    }
    if (phase !== "loading") return;
    const timeout = window.setTimeout(finish, 5000);
    return () => window.clearTimeout(timeout);
  }, [finish, phase, reducedMotion]);

  if (reducedMotion || phase === "done") return still;

  return (
    <>
      {phase === "loading" && still}
      <Suspense fallback={null}>
        <GuestAnimation {...runtime} onStart={start} onFinish={finish} />
      </Suspense>
    </>
  );
}

export default function GuestMotion({ playKey }: { playKey?: string }) {
  const { venue } = useVenue();
  const animation = venue.id === "sweeto" ? sweetoStamp : guestStamp;
  return (
    <span className="papu-stamp-motion" aria-hidden="true">
      {playKey && venue.id === "sweeto" ? (
        <SweetoImprint key={playKey} />
      ) : playKey ? (
        <MotionPlayback key={`${venue.id}-${playKey}`} animation={animation} />
      ) : (
        <MotionStill src={animation.poster} />
      )}
    </span>
  );
}
