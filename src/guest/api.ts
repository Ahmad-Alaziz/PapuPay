export interface LoyaltyCard {
  code: string;
  checkout: string;
  stamps: number;
  goal: number;
  rewardAvailable: boolean;
  visits: number;
  updatedAt: string;
}

export interface VenueStatus {
  id: string;
  name: string;
  address: string;
  logoUrl: string;
  logoWhiteUrl?: string;
  photoUrl: string;
  photoMotion?: "sauce-drip" | "chocolate-drip" | null;
  photoDrip?: { x: number; y?: number; width?: number; color: string };
  mapUrl?: string;
  menuImageUrl?: string;
  menuFallback?: string;
  theme: {
    background: string;
    ink: string;
    accent: string;
    muted: string;
    surface: string;
    font: string;
    motionTheme?: "sweeto" | "berry" | "forest";
  };
  wifi?: { ssid: string; security: "WPA" | "WEP" | "nopass"; hidden: boolean };
  reviewUrl: string | null;
  menuPdf?: Partial<Record<"en" | "pl" | "ru", string | null>>;
}

class GuestRequestError extends Error {
  constructor(readonly status: number) {
    super(`Request failed: ${status}`);
  }
}

export function isGuestServiceUnavailable(error: unknown) {
  return (
    error instanceof GuestRequestError &&
    (error.status === 502 || error.status === 503)
  );
}

export async function guestRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
  });
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("application/json")
  ) {
    throw new GuestRequestError(response.status);
  }
  return response.json() as Promise<T>;
}
