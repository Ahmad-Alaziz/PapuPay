import { ArrowDownToLine } from "papu-guest-icons";
import { useEffect, useRef, useState } from "react";
import { guestRequest } from "./api";
import type { Language } from "./catalog";
import { readGoogleSaveURL } from "./walletAvailability";

const appleBadgeLanguages = (process.env.NEXT_PUBLIC_APPLE_WALLET_BADGES ?? "").split(",");

const copy = {
  en: {
    apple: "Add to Apple Wallet",
    appleDownload: "Download Apple Wallet pass",
    google: "Add to Google Wallet",
    preparing: "Opening Google Wallet…",
    failed: "Couldn’t open Google Wallet. Try again.",
  },
  pl: {
    apple: "Dodaj do Portfela Apple",
    appleDownload: "Pobierz kartę do Portfela Apple",
    google: "Dodaj do Portfela Google",
    preparing: "Otwieramy Portfel Google…",
    failed: "Nie udało się otworzyć Portfela Google. Spróbuj ponownie.",
  },
  ru: {
    apple: "Добавить в Apple Wallet",
    appleDownload: "Скачать карту для Apple Wallet",
    google: "Добавить в Google Кошелек",
    preparing: "Открываем Google Кошелек…",
    failed: "Не удалось открыть Google Кошелек. Попробуйте ещё раз.",
  },
} satisfies Record<Language, object>;

export function AppleWalletLink({
  language,
  passUrl,
  supported,
  onHandoff,
}: {
  language: Language;
  passUrl: string;
  supported: boolean;
  onHandoff?: () => void;
}) {
  const labels = copy[language];
  const badgeLanguage = appleBadgeLanguages.includes(language)
    ? language
    : appleBadgeLanguages.includes("en") ? "en" : undefined;
  if (supported && badgeLanguage) {
    return (
      <a className="papu-wallet-badge" href={passUrl} onClick={onHandoff}>
        <img src={`/assets/wallet/apple-${badgeLanguage}.svg`} alt={labels.apple} />
      </a>
    );
  }
  return (
    <a className="papu-wallet-apple-link" href={passUrl} onClick={onHandoff}>
      <span>{supported ? labels.apple : labels.appleDownload}</span>
      <ArrowDownToLine size={17} aria-hidden="true" />
    </a>
  );
}

export function GoogleWalletButton({
  apiBase,
  language,
  onHandoff,
}: {
  apiBase: string;
  language: Language;
  onHandoff?: () => void;
}) {
  const labels = copy[language];
  const [phase, setPhase] = useState<"idle" | "opening" | "error">("idle");
  const active = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      const request = active.current;
      active.current = null;
      request?.abort();
    },
    [apiBase],
  );

  async function add() {
    if (active.current) return;
    const request = new AbortController();
    active.current = request;
    setPhase("opening");
    const timeout = window.setTimeout(() => request.abort(), 10_000);
    try {
      const response = await guestRequest<unknown>(
        `${apiBase}/loyalty/google-wallet`,
        {
          method: "POST",
          signal: request.signal,
        },
      );
      if (request.signal.aborted)
        throw new Error("Wallet link request timed out");
      const url = readGoogleSaveURL(response);
      if (!url) throw new Error("Invalid Google Wallet link");
      onHandoff?.();
      window.location.assign(url);
      setPhase("idle");
    } catch {
      if (active.current === request) setPhase("error");
    } finally {
      window.clearTimeout(timeout);
      if (active.current === request) active.current = null;
    }
  }

  return (
    <div className="papu-wallet-google">
      <button
        className="papu-wallet-badge"
        type="button"
        aria-disabled={phase === "opening"}
        onClick={() => void add()}
      >
        <img src={`/assets/wallet/google-${language}.svg`} alt={labels.google} />
      </button>
      {phase === "opening" && (
        <p className="papu-wallet-google-message" role="status">
          {labels.preparing}
        </p>
      )}
      {phase === "error" && (
        <p className="papu-wallet-google-message" role="alert">
          {labels.failed}
        </p>
      )}
    </div>
  );
}
