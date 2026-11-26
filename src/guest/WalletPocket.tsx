import { lazy, Suspense, useSyncExternalStore } from "react";
import "./wallet-pocket.css";

const PocketPlayer = lazy(() =>
  import("./WalletPocketPlayer").catch(() => ({ default: () => <></> })),
);
const motionPreference = "(prefers-reduced-motion: no-preference)";

function subscribe(update: () => void) {
  const preference = window.matchMedia(motionPreference);
  preference.addEventListener("change", update);
  return () => preference.removeEventListener("change", update);
}

export default function WalletPocket({ handoff }: { handoff: boolean }) {
  const canAnimate = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(motionPreference).matches,
    () => false,
  );

  return (
    <span className="papu-wallet-pocket" aria-hidden="true">
      {canAnimate && (
        <Suspense fallback={null}>
          <PocketPlayer handoff={handoff} />
        </Suspense>
      )}
    </span>
  );
}
