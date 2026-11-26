import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

export type SweetoMotionKind = "menu" | "loyalty" | "review" | "wifi";
export type SweetoMotionTheme = "sweeto" | "berry" | "forest";
export const SweetoMotionThemeContext =
  createContext<SweetoMotionTheme>("sweeto");

const SweetoMotionPlayer = lazy(() =>
  import("./SweetoMotionPlayer").catch(() => ({ default: () => <></> })),
);
const preference = "(prefers-reduced-motion: reduce)";
const size = "var(--sweeto-motion-size, 72px)";
const introSeen = new Set<string>();
const introQueue = new Set<(release: () => void) => void>();
let introActive = false;
const activePlayers = new Set<object>();
const idlePlayers = new Map<object, () => void>();
let idleTimer: number | undefined;
let idleTurn = 0;
let lastPlay = 0;

function stopIdle() {
  clearTimeout(idleTimer);
  idleTimer = undefined;
}

function scheduleIdle() {
  if (idleTimer !== undefined || !idlePlayers.size || document.hidden) return;
  const pauses = [12000, 15000, 13000, 16000];
  idleTimer = window.setTimeout(() => {
    idleTimer = undefined;
    if (
      !document.hidden && !introActive && !activePlayers.size &&
      !document.querySelector("dialog[open]") && performance.now() - lastPlay >= 11000
    ) {
      const next = idlePlayers.entries().next().value;
      if (next) {
        const [token, play] = next;
        idlePlayers.delete(token);
        idlePlayers.set(token, play);
        play();
      }
    }
    scheduleIdle();
  }, pauses[idleTurn++ % pauses.length]);
}

function onIdleVisibility() {
  stopIdle();
  lastPlay = performance.now();
  scheduleIdle();
}

function registerIdle(token: object, play: () => void) {
  if (!idlePlayers.size) document.addEventListener("visibilitychange", onIdleVisibility);
  idlePlayers.set(token, play);
  scheduleIdle();
  return () => {
    idlePlayers.delete(token);
    if (!idlePlayers.size) {
      stopIdle();
      document.removeEventListener("visibilitychange", onIdleVisibility);
    }
  };
}

function runNextIntro() {
  if (introActive) return;
  const next = introQueue.values().next().value;
  if (!next) return;

  introQueue.delete(next);
  introActive = true;
  next(() => {
    introActive = false;
    runNextIntro();
  });
}

function subscribeToPreference(update: () => void) {
  const media = window.matchMedia(preference);
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}

function prefersReducedMotion() {
  return window.matchMedia(preference).matches;
}

export default function SweetoMotion({
  kind,
  theme,
  playKey,
  playOnMount = false,
  interactive = true,
  className,
}: {
  kind: SweetoMotionKind;
  theme?: SweetoMotionTheme;
  playKey?: number;
  playOnMount?: boolean;
  interactive?: boolean;
  className?: string;
}) {
  const inheritedTheme = useContext(SweetoMotionThemeContext);
  const activeTheme = theme ?? inheritedTheme;
  const introKey = `${activeTheme}:${kind}`;
  const posterTheme = activeTheme === "sweeto" ? "" : `${activeTheme}-`;
  const host = useRef<HTMLSpanElement>(null);
  const token = useRef({});
  const previousKey = useRef<number | undefined>(undefined);
  const entered = useRef(false);
  const releaseIntro = useRef<(() => void) | undefined>(undefined);
  const nextId = useRef(1);
  const [playback, setPlayback] = useState<number>();
  const [paintingTheme, setPaintingTheme] = useState<SweetoMotionTheme>();
  const [inView, setInView] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeToPreference,
    prefersReducedMotion,
    () => true,
  );

  const clearIntro = useCallback(() => {
    const release = releaseIntro.current;
    releaseIntro.current = undefined;
    release?.();
  }, []);

  const finish = useCallback(() => {
    activePlayers.delete(token.current);
    setPaintingTheme(undefined);
    setPlayback(undefined);
    clearIntro();
  }, [clearIntro]);

  const play = useCallback(
    (restart = false) => {
      if (reduced || !inView || document.hidden) return;
      activePlayers.add(token.current);
      lastPlay = performance.now();
      const id = nextId.current++;
      if (restart) setPaintingTheme(undefined);
      setPlayback((previous) => (restart ? id : (previous ?? id)));
    },
    [inView, reduced],
  );

  const start = useCallback(() => {
    introSeen.add(introKey);
    setPaintingTheme(activeTheme);
  }, [activeTheme, introKey]);

  useEffect(() => {
    if (!host.current || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.intersectionRatio >= 0.15);
      },
      { threshold: 0.15 },
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (playback === undefined) return;
    // The ready player owns its short one-shot duration. This guard only
    // recovers a failed lazy/runtime load on a slow mobile connection.
    const timer = window.setTimeout(finish, 10000);
    return () => clearTimeout(timer);
  }, [finish, playback]);

  useEffect(() => {
    const playerToken = token.current;
    return () => {
      activePlayers.delete(playerToken);
      clearIntro();
    };
  }, [clearIntro]);

  useEffect(() => {
    if (!interactive || reduced || !inView || !host.current?.closest(".sweeto-main")) return;
    return registerIdle(token.current, () => play());
  }, [interactive, inView, play, reduced]);

  useEffect(() => {
    if (reduced) {
      previousKey.current = playKey;
      entered.current = true;
      finish();
      return;
    }
    if (!inView) {
      finish();
      return;
    }

    const explicitPlayback =
      playKey !== undefined && previousKey.current !== playKey;
    previousKey.current = playKey;
    if (explicitPlayback) {
      entered.current = true;
      play(true);
      return;
    }
    if (entered.current) return;
    if (playOnMount) {
      entered.current = true;
      play();
      return;
    }
    if (introSeen.has(introKey)) return;

    const launch = (release: () => void) => {
      if (document.hidden || introSeen.has(introKey)) {
        release();
        return;
      }
      entered.current = true;
      releaseIntro.current = release;
      play();
    };
    introQueue.add(launch);
    runNextIntro();
    return () => {
      introQueue.delete(launch);
    };
  }, [finish, inView, introKey, play, playKey, playOnMount, reduced]);

  useEffect(() => {
    if (!interactive) return;
    const trigger = host.current?.closest("button, a[href]");
    if (!trigger) return;
    const onPointerEnter = (event: Event) => {
      if ((event as PointerEvent).pointerType !== "touch") play();
    };
    const onPointerDown = () => play();
    const onFocus = () => {
      if (trigger.matches(":focus-visible")) play();
    };
    trigger.addEventListener("pointerenter", onPointerEnter);
    trigger.addEventListener("pointerdown", onPointerDown);
    trigger.addEventListener("focus", onFocus);
    return () => {
      trigger.removeEventListener("pointerenter", onPointerEnter);
      trigger.removeEventListener("pointerdown", onPointerDown);
      trigger.removeEventListener("focus", onFocus);
    };
  }, [interactive, play]);

  return (
    <span
      ref={host}
      className={className}
      aria-hidden="true"
      style={{
        position: "relative",
        display: "inline-block",
        pointerEvents: "none",
        flex: "none",
        width: size,
        height: size,
      }}
    >
      <img
        src={`/assets/sweeto/motion-${posterTheme}${kind}.webp`}
        width="128"
        height="128"
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          opacity: paintingTheme === activeTheme && !reduced ? 0 : 1,
        }}
      />
      {playback !== undefined && !reduced && (
        <Suspense fallback={null}>
          <SweetoMotionPlayer
            key={`${activeTheme}:${playback}`}
            kind={kind}
            theme={activeTheme}
            onStart={start}
            onFinish={finish}
          />
        </Suspense>
      )}
    </span>
  );
}
