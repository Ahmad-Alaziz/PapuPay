type WalletStatus = "unconfigured" | "requires_card" | "ready" | "error";

export interface WalletAvailability {
  status: WalletStatus;
  passUrl: string | null;
  updatesEnabled: boolean;
  recoveryEnabled: boolean;
  googleStatus: WalletStatus;
}

function readStatus(value: unknown): WalletStatus {
  return value === "unconfigured" ||
    value === "requires_card" ||
    value === "ready"
    ? value
    : "error";
}

export function readWalletAvailability(
  value: unknown,
  apiBase: string,
): WalletAvailability {
  const response =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : null;
  const expectedPass = `${apiBase}/loyalty/apple-wallet.pkpass`;
  const appleStatus = readStatus(response?.status);
  const passUrl =
    appleStatus === "ready" && response?.passUrl === expectedPass
      ? expectedPass
      : null;
  return {
    status: appleStatus === "ready" && !passUrl ? "error" : appleStatus,
    passUrl,
    updatesEnabled: Boolean(passUrl) && response?.updatesEnabled === true,
    recoveryEnabled: Boolean(passUrl) && response?.recoveryEnabled === true,
    googleStatus:
      response?.googleStatus === undefined
        ? "unconfigured"
        : readStatus(response.googleStatus),
  };
}

export function canOpenAppleWallet(userAgent: string) {
  return (
    /iPhone|iPad|iPod|Macintosh/.test(userAgent) &&
    !/Android|Windows Phone/.test(userAgent)
  );
}

export function readGoogleSaveURL(value: unknown): string | null {
  const url =
    value && typeof value === "object" && "url" in value ? value.url : null;
  if (typeof url !== "string") return null;
  const match =
    /^https:\/\/pay\.google\.com\/gp\/v\/save\/([\w-]+\.[\w-]+\.[\w-]+)$/.exec(
      url,
    );
  return match && match[0] === url && match[1].length <= 1800 ? url : null;
}
