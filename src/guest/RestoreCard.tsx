import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, RefreshCw } from "papu-guest-icons";
import type { Language } from "./catalog";
import { guestRequest, type LoyaltyCard } from "./api";
import { useVenue } from "./VenueContext";
import QRCode from "./QRCode";
import { SweetoMemberCard } from "./SweetoCard";
import { browserDemo, saveDemo, savedDemoChanged, savedDemoFragment, subscribeDemo } from "./saved-demo-card";
import "./restore.css";

const copy = {
  pl: {
    replaceDemo: "Użyj stanu z Portfela",
    keepDemo: "Zachowaj obecną kartę",
    currentDemo: (n: number) => `W tej przeglądarce masz kartę demo z innym stanem (${n}/6).`,
    demoQr: "Kod QR karty testowej Sweeto",
    savedDemo: "Zapisana karta testowa",
    emptyDemo: "Aby zapisać kartę testową, otwórz ją z Portfela Apple w tej przeglądarce.",
    saveFailed: "Nie udało się zapisać karty. Możesz ponownie otworzyć ten podgląd z Portfela Apple.",
    loading: "Sprawdzamy kartę…",
    code: "Kod karty",
    stamps: "pieczątek",
    open: "Otwórz moją kartę",
    invalid: "Ten link już nie działa",
    invalidBody:
      "Otwórz link z najnowszej karty w Portfelu lub poproś obsługę o pomoc.",
    error: "Nie udało się połączyć. Spróbuj ponownie.",
    retry: "Spróbuj ponownie",
    replace:
      "W tej przeglądarce masz inną kartę. Po otwarciu przełączymy się na kartę poniżej.",
  },
  en: {
    replaceDemo: "Use Wallet balance",
    keepDemo: "Keep current card",
    currentDemo: (n: number) => `This browser has a demo card with a different balance (${n}/6).`,
    demoQr: "Sweeto demo card QR code",
    savedDemo: "Saved TestFlight card",
    emptyDemo: "To save a demo card here, open your TestFlight pass from Apple Wallet in this browser.",
    saveFailed: "This browser couldn’t save the card. You can reopen this preview from Apple Wallet.",
    loading: "Checking your card…",
    code: "Card code",
    stamps: "stamps",
    open: "Open my card",
    invalid: "This link has expired",
    invalidBody:
      "Open the link in your latest Wallet pass or ask the team for help.",
    error: "Couldn’t connect. Please try again.",
    retry: "Try again",
    replace:
      "This browser has a different card. Opening this card will switch to the one below.",
  },
  ru: {
    replaceDemo: "Сохранить баланс из Wallet",
    keepDemo: "Оставить текущую карту",
    currentDemo: (n: number) => `В браузере есть демо-карта с другим балансом (${n}/6).`,
    demoQr: "QR-код демоверсии карты Sweeto",
    savedDemo: "Сохранённая карта TestFlight",
    emptyDemo: "Чтобы сохранить демокарту, откройте её из Apple Wallet в этом браузере.",
    saveFailed: "Не удалось сохранить карту в этом браузере. Вы можете снова открыть её из Apple Wallet.",
    loading: "Проверяем карту…",
    code: "Код карты",
    stamps: "отметок",
    open: "Открыть мою карту",
    invalid: "Эта ссылка больше не действует",
    invalidBody:
      "Откройте ссылку в последней версии карты в Wallet или обратитесь к сотруднику.",
    error: "Не удалось подключиться. Попробуйте ещё раз.",
    retry: "Попробовать снова",
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
      redirect: "error",
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
  if (!preview || typeof preview.code !== "string" || !/^[A-Z0-9]{8}$/.test(preview.code) ||
      !Number.isSafeInteger(preview.goal) || preview.goal < 1 || !Number.isSafeInteger(preview.stamps) ||
      preview.stamps < 0 || preview.stamps > preview.goal) return { status: "error" };
  if (!session.value || !("card" in session.value) ||
      (session.value.card !== null && !/^[A-Z0-9]{8}$/.test(session.value.card?.code ?? ""))) return { status: "error" };
  return { status: "ready", preview, currentCode: session.value.card?.code };
}

function CardSummary({ preview, language }: { preview: Preview; language: Language }) {
  const t = copy[language];
  return (
    <dl className="papu-restore-summary">
      <div>
        <dt>{t.code}</dt>
        <dd><bdi>{preview.code}</bdi></dd>
      </div>
      <div>
        <dt>{t.stamps}</dt>
        <dd>{preview.stamps} / {preview.goal}</dd>
      </div>
    </dl>
  );
}

const noDemo = () => null;

export function SavedDemoLink({ language }: { language: Language }) {
  const saved = useSyncExternalStore(subscribeDemo, browserDemo, noDemo);
  if (saved === null) return null;
  return (
    <p className="papu-saved-demo-link">
      <a href={`/v/sweeto/card${location.search}${savedDemoFragment}`}>{copy[language].savedDemo}<ArrowRight size={16} aria-hidden="true" /></a>
    </p>
  );
}

export function DemoPassSnapshot({ language, stamps, useSaved, atCounter = false }: {
  language: Language;
  stamps: number | null;
  useSaved?: () => void;
  atCounter?: boolean;
}) {
  const t = copy[language];
  const saved = useSyncExternalStore(subscribeDemo, browserDemo, noDemo);
  const [saveFailed, setSaveFailed] = useState(false);
  const count = stamps ?? saved;
  const conflict = stamps !== null && saved !== null && saved !== stamps;

  async function persist(value: number, expected: number | null) {
    const write = () => saveDemo(window.localStorage, value, expected);
    try {
      if (navigator.locks) await navigator.locks.request(savedDemoChanged, write);
      else write();
      window.dispatchEvent(new Event(savedDemoChanged));
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    }
  }

  useEffect(() => {
    if (stamps !== null && saved === null) void persist(stamps, null);
  }, [stamps, saved]);

  return (
    <section className="sweeto-loyalty papu-loyalty" data-papu-paper aria-label={t.savedDemo}>
      {count !== null ? <SweetoMemberCard language={language} demo stamps={count} goal={6} code="DEMO2026" initiallyAtCounter={atCounter}
        qr={<QRCode value="PAPUPAY-DEMO:SWEETO:DEMO2026" label={t.demoQr} />} /> : <p>{t.emptyDemo}</p>}
      {conflict && <div className="papu-demo-replace">
        <p>{t.currentDemo(saved)}</p>
        <button type="button" onClick={useSaved}>{t.keepDemo}</button>
        <button type="button" onClick={() => void persist(stamps, saved)}>{t.replaceDemo}</button>
      </div>}
      {saveFailed && <p className="sweeto-error" role="status">{t.saveFailed}</p>}
    </section>
  );
}

type ReadyCheck = Extract<RestoreCheck, { status: "ready" }>;

export async function openMembership(apiBase: string, token: string, checked: ReadyCheck, signal: AbortSignal) {
  if (checked.currentCode === checked.preview.code) return;
  const response = await fetch(`${apiBase}/loyalty/restore`, {
    method: "POST",
    redirect: "error",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, expectedCurrentCode: checked.currentCode ?? null }),
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  if (invalidStatus(response.status)) throw new Error("invalid");
  if (!response.ok) throw new Error(response.status === 409 ? "session_changed" : "unavailable");
  const result: { card?: LoyaltyCard } = await response.json();
  if (result.card?.code !== checked.preview.code) throw new Error("unavailable");
  const session = await guestRequest<{ card: LoyaltyCard | null }>(`${apiBase}/loyalty/card`, { signal });
  if (session.card?.code !== checked.preview.code) throw new Error("unavailable");
}

export default function RestoreCard({ language, token, onRestored }: {
  language: Language; token: string; onRestored: () => void;
}) {
  const { apiBase } = useVenue();
  const [attempt, setAttempt] = useState(0);
  const [approvedCode, setApprovedCode] = useState<string | null>(null);
  const [check, setCheck] = useState<RestoreCheck>({ status: "loading" });
  const onSuccess = useRef(onRestored);
  const heading = useId();
  const t = copy[language];
  useEffect(() => { onSuccess.current = onRestored; }, [onRestored]);

  useEffect(() => {
    if (!token) { setCheck({ status: "invalid" }); return; }
    const controller = new AbortController();
    const { signal } = controller;
    setCheck({ status: "loading" });
    async function enter() {
      try {
        const checked = await checkRestore(apiBase, token, signal);
        if (signal.aborted) return;
        if (checked.status !== "ready" || (checked.currentCode && checked.currentCode !== checked.preview.code && checked.currentCode !== approvedCode)) {
          setCheck(checked);
          return;
        }
        await openMembership(apiBase, token, checked, signal);
        if (!signal.aborted) onSuccess.current();
      } catch (error) {
        if (signal.aborted) return;
        if (error instanceof Error && error.message === "session_changed") {
          // Membership changed in another tab. Read the new identity before offering a switch.
          setApprovedCode(null);
          setAttempt(n => n + 1);
        } else setCheck({ status: error instanceof Error && error.message === "invalid" ? "invalid" : "error" });
      }
    }
    void enter();
    return () => controller.abort();
  }, [apiBase, token, attempt, approvedCode]);

  if (check.status === "loading") return <p className="sweeto-loading" role="status">{t.loading}</p>;
  return (
    <section className="papu-restore" aria-labelledby={heading}>
      {check.status === "invalid" ? <>
        <h2 id={heading}>{t.invalid}</h2><p>{t.invalidBody}</p>
      </> : check.status === "ready" ? <>
        <h2 id={heading}>{t.open}</h2>
        <p>{t.replace}</p>
        <CardSummary preview={check.preview} language={language} />
        <button className="sweeto-button" type="button" onClick={() => setApprovedCode(check.currentCode ?? null)}>
          {t.open}<ArrowRight size={18} aria-hidden="true" />
        </button>
        <button className="papu-restore-keep" type="button" onClick={onRestored}>{t.keepDemo}</button>
      </> : <>
        <p role="alert" id={heading}>{t.error}</p>
        <button className="sweeto-button" type="button" onClick={() => { setApprovedCode(null); setAttempt(n => n + 1); }}>
          {t.retry}<RefreshCw size={18} aria-hidden="true" />
        </button>
      </>}
    </section>
  );
}
