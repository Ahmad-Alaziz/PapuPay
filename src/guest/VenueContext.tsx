import { createContext, useContext, type ReactNode } from "react";
import type { VenueStatus } from "./api";
import { guestPath, type View } from "./route";

export const sweeto: VenueStatus = {
  id: "sweeto",
  name: "Sweeto",
  address: "Puławska 246/8, Warszawa",
  logoUrl: "/assets/sweeto/logo-blue.png",
  logoWhiteUrl: "/assets/sweeto/logo-white.png",
  photoUrl: "/assets/sweeto/matylda-puddle.webp",
  photoMotion: "sauce-drip",
  photoDrip: { x: 0.733, y: 0.99, width: 0.077, color: "#581f08" },
  menuImageUrl: "/assets/sweeto/menu-original.jpg",
  mapUrl: "https://www.google.com/maps?cid=12629433022150019195",
  reviewUrl:
    "https://search.google.com/local/writereview?placeid=ChIJZSkE8-IzGUcRewjXh2vCRK8",
  theme: {
    background: "#fffcf7",
    ink: "#0c477b",
    accent: "#1765a8",
    muted: "#647382",
    surface: "#e8f0f8",
    font: "bricolage",
    motionTheme: "sweeto",
  },
};
type GuestView = Exclude<View, "missing">;
export const VenueContext = createContext<{
  venue: VenueStatus;
  apiBase: string;
  navigate?: (view: GuestView) => void;
}>({ venue: sweeto, apiBase: "/api/v/sweeto" });
export function useVenue() {
  return useContext(VenueContext);
}
export function GuestLink({
  view,
  children,
  className,
}: {
  view: GuestView;
  children: ReactNode;
  className?: string;
}) {
  const { venue, navigate } = useVenue();
  return (
    <a
      className={className}
      href={guestPath(view, venue.id)}
      onClick={(event) => {
        if (
          !navigate ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        )
          return;
        event.preventDefault();
        navigate(view);
      }}
    >
      {children}
    </a>
  );
}
