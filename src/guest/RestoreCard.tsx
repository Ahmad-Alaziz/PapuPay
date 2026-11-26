import { useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, Check, RefreshCw, TicketCheck } from "papu-guest-icons";
import type { Language } from "./catalog";
import { guestRequest, type LoyaltyCard } from "./api";
import { useVenue } from "./VenueContext";
import QRCode from "./QRCode";
import { SweetoMemberCard } from "./SweetoCard";
import { browserDemo, saveDemo, savedDemoChanged, savedDemoFragment, subscribeDemo } from "./saved-demo-card";
import "./restore.css";

const copy = {
  pl: {
    title: "Twoja karta, tutaj",
    demoTitle: "Karta testowa Sweeto",
    demoNote: "Liczba pieczątek w chwili zapisania karty w Portfelu. Ten podgląd służy do testów w TestFlight.",
    demoQr: "Kod QR karty testowej Sweeto",
    saveDemo: "Zapisz kartę testową w przeglądarce",
    savedDemo: "Zapisana karta testowa",
    openSaved: "Otwórz zapisaną kartę testową",
    demoStored: "Karta testowa jest zapisana w tej przeglądarce.",
    replaceDemo: "Zastąp zapisaną kartę testową",
    replaceCount: (old: number, next: number) => `Zmienić liczbę pieczątek w zapisanej kopii z ${old}/6 na ${next}/6?`,
    keepDemo: "Zachowaj obecną kopię",
    savedNote: "To zapisana kopia z TestFlight. Znajdziesz ją również na ekranie karty.",
    emptyDemo: "Aby zapisać kartę testową, otwórz ją z Portfela Apple w tej przeglądarce.",
    saveFailed: "Nie udało się zapisać karty. Możesz ponownie otworzyć ten podgląd z Portfela Apple.",
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
    demoTitle: "Sweeto demo card",
    demoNote: "These stamps were on the pass when you saved it to Wallet. This preview is for TestFlight testing.",
    demoQr: "Sweeto demo card QR code",
    saveDemo: "Save demo card in this browser",
    savedDemo: "Saved TestFlight card",
    openSaved: "Open saved demo card",
    demoStored: "Your demo card is saved in this browser.",
    replaceDemo: "Replace saved demo card",
    replaceCount: (old: number, next: number) => `Change your saved copy from ${old}/6 to ${next}/6 stamps?`,
    keepDemo: "Keep current copy",
    savedNote: "This is your saved TestFlight copy. You can also open it from the card screen.",
    emptyDemo: "To save a demo card here, open your TestFlight pass from Apple Wallet in this browser.",
    saveFailed: "This browser couldn’t save the card. You can reopen this preview from Apple Wallet.",
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
    demoTitle: "Демокарта Sweeto",
    demoNote: "Столько отметок было на карте при сохранении в Wallet. Это демоверсия для тестирования в TestFlight.",
    demoQr: "QR-код демоверсии карты Sweeto",
    saveDemo: "Сохранить демокарту в браузере",
    savedDemo: "Сохранённая карта TestFlight",
    openSaved: "Открыть сохранённую демокарту",
    demoStored: "Демокарта сохранена в этом браузере.",
    replaceDemo: "Заменить сохранённую демокарту",
    replaceCount: (old: number, next: number) => `Изменить число отметок на сохранённой карте с ${old}/6 на ${next}/6?`,
    keepDemo: "Оставить текущую копию",
    savedNote: "Это сохранённая копия из TestFlight. Её можно открыть и на экране карты.",
    emptyDemo: "Чтобы сохранить демокарту, откройте её из Apple Wallet в этом браузере.",
    saveFailed: "Не удалось сохранить карту в этом браузере. Вы можете снова открыть её из Apple Wallet.",
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
const savedDemoPath = "/v/sweeto/restore" + savedDemoFragment;

export function SavedDemoLink({ language }: { language: Language }) {
  const saved = useSyncExternalStore(subscribeDemo, browserDemo, noDemo);
  if (saved === null) return null;
  return (
    <p className="papu-saved-demo-link">
      <a href={savedDemoPath}>{copy[language].savedDemo}<ArrowRight size={16} aria-hidden="true" /></a>
    </p>
  );
}

export function DemoPassSnapshot({ language, stamps }: { language: Language; stamps: number | null }) {
  const t = copy[language];
  const heading = useId();
  const saved = useSyncExternalStore(subscribeDemo, browserDemo, noDemo);
  const [saveFailed, setSaveFailed] = useState(false);
  const [replacing, setReplacing] = useState<{ old: number; next: number } | null>(null);
  const saving = useRef(false);
  const title = useRef<HTMLHeadingElement>(null);
  const onward = useRef<HTMLAnchorElement>(null);
  const replaceTrigger = useRef<HTMLButtonElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef<"onward" | "replace" | "title" | null>(null);
  const count = stamps ?? saved;
  const confirmedChoice = replacing && replacing.old === saved && replacing.next === stamps;

  useLayoutEffect(() => {
    if (confirmedChoice) keep.current?.focus({ preventScroll: true });
    else if (moveFocus.current) {
      const target = moveFocus.current === "title" ? title.current :
        moveFocus.current === "onward" ? onward.current : replaceTrigger.current;
      if (target) {
        target.focus({ preventScroll: true });
        moveFocus.current = null;
      }
    }
  }, [confirmedChoice, saved, stamps]);

  async function save(expected: number | null) {
    if (stamps === null || saving.current) return;
    saving.current = true;
    try {
      const write = () => saveDemo(window.localStorage, stamps, expected);
      const savedNow = navigator.locks ? await navigator.locks.request(savedDemoChanged, write) : write();
      if (savedNow) moveFocus.current = "onward";
      setReplacing(null);
      setSaveFailed(false);
      window.dispatchEvent(new Event(savedDemoChanged));
    } catch {
      setSaveFailed(true);
    } finally {
      saving.current = false;
    }
  }

  return (
    <section className="papu-restore" aria-labelledby={heading}>
      <header className="papu-restore-heading">
        <span className="papu-restore-mark" aria-hidden="true"><TicketCheck size={29} /></span>
        <div><p>TestFlight</p><h2 id={heading} ref={title} tabIndex={-1}>{stamps === null ? t.savedDemo : t.demoTitle}</h2></div>
      </header>
      <p>{count === null ? t.emptyDemo : stamps === null ? t.savedNote : t.demoNote}</p>
      {count !== null && (
        <SweetoMemberCard key={stamps === null ? "saved" : stamps} language={language} demo stamps={count} goal={6} code="DEMO2026"
          qr={<QRCode value="PAPUPAY-DEMO:SWEETO:DEMO2026" label={t.demoQr} />} />
      )}
      {stamps !== null && saved === null && (
        <button className="sweeto-button papu-demo-save" type="button" onClick={() => void save(null)}>
          {t.saveDemo}<ArrowRight size={18} aria-hidden="true" />
        </button>
      )}
      {stamps !== null && saved !== null && (
        <>
          {saved === stamps && (
            <p className="papu-restore-note" role="status">
              <Check size={16} aria-hidden="true" />{t.demoStored}
            </p>
          )}
          <a ref={onward} className="sweeto-button papu-demo-save" href={savedDemoFragment}
            onClick={(event) => {
              if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) moveFocus.current = "title";
            }}>
            {t.openSaved}<ArrowRight size={18} aria-hidden="true" />
          </a>
          {saved !== stamps && (confirmedChoice ? (
            <div className="papu-demo-replace" role="group" aria-label={t.replaceDemo}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  moveFocus.current = "replace";
                  setReplacing(null);
                }
              }}>
              <p>{t.replaceCount(saved, stamps)}</p>
              <button ref={keep} type="button" onClick={() => { moveFocus.current = "replace"; setReplacing(null); }}>
                {t.keepDemo}
              </button>
              <button type="button" onClick={() => void save(saved)}>{t.replaceDemo}</button>
            </div>
          ) : (
            <button ref={replaceTrigger} className="papu-demo-replace-trigger" type="button"
              onClick={() => setReplacing({ old: saved, next: stamps })}>{t.replaceDemo}</button>
          ))}
        </>
      )}
      {saveFailed && <p className="sweeto-error" role="alert">{t.saveFailed}</p>}
    </section>
  );
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
  const [attempt, setAttempt] = useState(0);
  const [checked, setChecked] = useState<{
    token: string; apiBase: string; attempt: number; result: RestoreCheck;
  } | null>(null);
  const check: RestoreCheck = !token
    ? { status: "invalid" }
    : checked?.token === token && checked.apiBase === apiBase && checked.attempt === attempt
      ? checked.result : { status: "loading" };
  const { status } = check;
  const [handoff, setHandoff] = useState<{ token: string; status: "pending" | "error" } | null>(null);
  const opening = handoff?.token === token && handoff.status === "pending";
  const saveError = handoff?.token === token && handoff.status === "error";
  const t = copy[language];
  useLayoutEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void checkRestore(apiBase, token, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setChecked({ token, apiBase, attempt, result });
      })
      .catch(() => {
        if (!controller.signal.aborted) setChecked({ token, apiBase, attempt, result: { status: "error" } });
      });
    return () => {
      controller.abort();
      saving.current?.abort();
    };
  }, [apiBase, attempt, token]);
  async function restore() {
    if (saving.current || status !== "ready") return;
    const controller = new AbortController();
    saving.current = controller;
    setHandoff({ token, status: "pending" });
    try {
      const response = await fetch(`${apiBase}/loyalty/restore`, {
        method: "POST",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (invalidStatus(response.status)) {
        setChecked({ token, apiBase, attempt, result: { status: "invalid" } });
        return;
      }
      if (!response.ok) throw new Error("unavailable");
      const restored: { card?: LoyaltyCard } = await response.json();
      if (restored.card?.code !== check.preview.code) throw new Error("unavailable");
      const session = await guestRequest<{ card: LoyaltyCard | null }>(
        `${apiBase}/loyalty/card`, { signal: controller.signal },
      );
      if (session.card?.code !== check.preview.code) throw new Error("unavailable");
      if (!controller.signal.aborted) {
        onRestored();
        navigate?.("card");
      }
    } catch {
      if (!controller.signal.aborted) setHandoff({ token, status: "error" });
    } finally {
      if (saving.current === controller) {
        saving.current = null;
        setHandoff((current) => current?.status === "pending" ? null : current);
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
            <CardSummary preview={check.preview} language={language} />
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
