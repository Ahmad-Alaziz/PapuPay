import { useId, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, Check, RefreshCw, TicketCheck } from "papu-guest-icons";
import type { Language } from "./catalog";
import { guestRequest, type LoyaltyCard } from "./api";
import { useVenue } from "./VenueContext";
import "./restore.css";

const copy = {
  pl: {
    title: "Twoja karta, tutaj",
    intro: "Otwórz tę samą kartę, którą masz w Portfelu Apple.",
    loading: "Sprawdzamy kartę…",
    code: "Kod karty",
    stamps: "pieczątek",
    open: "Otwórz moją kartę",
    opening: "Otwieramy kartę…",
    invalid: "Ten link już nie działa",
    invalidBody:
      "Otwórz link z najnowszej karty w Portfelu lub poproś obsługę o pomoc.",
    error: "Nie udało się połączyć. Spróbuj ponownie.",
    retry: "Spróbuj ponownie",
    note: "Karta zostanie zapisana w tej przeglądarce",
    replace:
      "W tej przeglądarce masz inną kartę. Po otwarciu przełączymy się na kartę poniżej.",
  },
  en: {
    title: "Your card, right here",
    intro: "Open the same card you keep in Apple Wallet.",
    loading: "Checking your card…",
    code: "Card code",
    stamps: "stamps",
    open: "Open my card",
    opening: "Opening your card…",
    invalid: "This link has expired",
    invalidBody:
      "Open the link in your latest Wallet pass or ask the team for help.",
    error: "Couldn’t connect. Please try again.",
    retry: "Try again",
    note: "Your card will be saved in this browser",
    replace:
      "This browser has a different card. Opening this card will switch to the one below.",
  },
  ru: {
    title: "Ваша карта здесь",
    intro: "Откройте ту же карту, которую вы храните в Apple Wallet.",
    loading: "Проверяем карту…",
    code: "Код карты",
    stamps: "отметок",
    open: "Открыть мою карту",
    opening: "Открываем карту…",
    invalid: "Эта ссылка больше не действует",
    invalidBody:
      "Откройте ссылку в последней версии карты в Wallet или обратитесь к сотруднику.",
    error: "Не удалось подключиться. Попробуйте ещё раз.",
    retry: "Попробовать снова",
    note: "Карта сохранится в этом браузере",
    replace:
      "В этом браузере сохранена другая карта. После открытия мы переключимся на карту ниже.",
  },
};
type Preview = { code: string; stamps: number; goal: number };
type RestoreCheck =
  | { status: "loading" | "invalid" | "error" }
  | { status: "ready"; preview: Preview; currentCode?: string };

function invalidStatus(status: number) {
  return [400, 401, 403, 404, 410].includes(status);
}

export async function checkRestore(
  apiBase: string,
  token: string,
  signal: AbortSignal,
): Promise<RestoreCheck> {
  const [target, session] = await Promise.allSettled([
    fetch(`${apiBase}/loyalty/restore/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
      credentials: "same-origin",
      signal,
    }),
    guestRequest<{ card: LoyaltyCard | null }>(`${apiBase}/loyalty/card`, {
      signal,
    }),
  ]);

  if (target.status === "fulfilled" && invalidStatus(target.value.status)) {
    return { status: "invalid" };
  }
  if (
    target.status !== "fulfilled" ||
    !target.value.ok ||
    session.status !== "fulfilled"
  ) {
    return { status: "error" };
  }
  const preview: Preview = await target.value.json();
  return { status: "ready", preview, currentCode: session.value.card?.code };
}

export default function RestoreCard({
  language,
  token,
  onRestored,
}: {
  language: Language;
  token: string;
  onRestored: () => void;
}) {
  const { venue, apiBase, navigate } = useVenue();
  const headingId = useId();
  const saving = useRef<AbortController | null>(null);
  const [check, setCheck] = useState<RestoreCheck>({ status: "loading" });
  const { status } = check;
  const [attempt, setAttempt] = useState(0);
  const [opening, setOpening] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const t = copy[language];
  useLayoutEffect(() => {
    setOpening(false);
    setSaveError(false);
    const controller = new AbortController();
    if (!token) {
      setCheck({ status: "invalid" });
      return;
    }
    setCheck({ status: "loading" });
    void checkRestore(apiBase, token, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setCheck(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setCheck({ status: "error" });
      });
    return () => {
      controller.abort();
      saving.current?.abort();
      saving.current = null;
    };
  }, [apiBase, attempt, token]);
  async function restore() {
    if (saving.current || status !== "ready") return;
    const controller = new AbortController();
    saving.current = controller;
    setOpening(true);
    setSaveError(false);
    try {
      const response = await fetch(`${apiBase}/loyalty/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (invalidStatus(response.status)) {
        setCheck({ status: "invalid" });
        return;
      }
      if (!response.ok) throw new Error("unavailable");
      if (!controller.signal.aborted) {
        onRestored();
        navigate?.("card");
      }
    } catch {
      if (!controller.signal.aborted) setSaveError(true);
    } finally {
      if (saving.current === controller) {
        saving.current = null;
        setOpening(false);
      }
    }
  }
  return (
    <section className="papu-restore" aria-labelledby={headingId}>
      <header className="papu-restore-heading">
        <span className="papu-restore-mark" aria-hidden="true">
          <TicketCheck size={29} strokeWidth={1.7} />
        </span>
        <div>
          <p>{venue.name}</p>
          <h2 id={headingId}>{status === "invalid" ? t.invalid : t.title}</h2>
        </div>
      </header>
      {status === "loading" ? (
        <p role="status">{t.loading}</p>
      ) : status === "invalid" ? (
        <p>{t.invalidBody}</p>
      ) : status === "error" ? (
        <>
          <p role="alert">{t.error}</p>
          <button
            className="sweeto-button"
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            <RefreshCw size={18} aria-hidden="true" />
            {t.retry}
          </button>
        </>
      ) : (
        check.status === "ready" && (
          <>
            <p>{t.intro}</p>
            <dl className="papu-restore-summary">
              <div>
                <dt>{t.code}</dt>
                <dd>
                  <bdi>{check.preview.code}</bdi>
                </dd>
              </div>
              <div>
                <dt>{t.stamps}</dt>
                <dd>
                  {check.preview.stamps} / {check.preview.goal}
                </dd>
              </div>
            </dl>
            {check.currentCode && check.currentCode !== check.preview.code && (
              <p className="papu-restore-replace">{t.replace}</p>
            )}
            <button
              className="sweeto-button"
              type="button"
              disabled={opening}
              onClick={() => void restore()}
            >
              {opening ? t.opening : t.open}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <p className="papu-restore-note">
              <Check size={16} aria-hidden="true" />
              {t.note}
            </p>
            {saveError && (
              <p className="sweeto-error" role="alert">
                {t.error}
              </p>
            )}
          </>
        )
      )}
    </section>
  );
}
