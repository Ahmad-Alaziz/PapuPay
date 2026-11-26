import { ArrowRight, Check, ChevronDown, Gift, ScanLine } from "papu-guest-icons";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { guestRequest, type LoyaltyCard } from "./api";
import type { Language } from "./catalog";
import { guestPath } from "./route";
import GuestMotion from "../GuestMotion";
import { observeStampBalance } from "./stampObservation";
import { GuestLink, useVenue } from "./VenueContext";
import "./wallet.css";
import "./loyalty-card.css";

const QRCode = lazy(() => import("./QRCode"));
const scanDuration = 440;

type Action = "stamp" | "redeem";
type Status = "loading" | "disabled" | "ready" | "error";
type Attempt = { kind: Action; code: string; actionId: string };

const copy = {
  en: {
    title: "Counter simulation",
    demoCard: "Demo card",
    stamps: "Stamps",
    scanTitle: "Scan the card",
    scanHint: "Each successful test scan adds one stamp.",
    stampHint: "The stamp is now on your card.",
    rewardHint: "Confirm redemption to start a new round.",
    nextRound: "A new round, the same card. Collect your next stamps.",
    demoNotice: "This is a demo. No real reward will be issued.",
    confirmTitle: "Redeem the test reward?",
    confirm: "Confirm redemption",
    cancel: "Cancel",
    eyebrow: "Development only",
    intro:
      "Try a checkout scan, collect stamps, and redeem a reward. Changes apply to the card in this browser.",
    disabled: "This venue’s checkout test is turned off.",
    loading: "Checking test availability…",
    needsCard: "Get a loyalty card in this browser to try the checkout flow.",
    getCard: "Get my card",
    openCard: "Open loyalty card",
    cardCode: "Card code",
    qr: "QR code for your test card",
    scan: "Simulate checkout scan",
    scanAgain: "Simulate another scan",
    scanning: "Reading card…",
    redeem: "Redeem test reward",
    saving: "Saving to your card…",
    added: "Test stamp added",
    redeemed: "Test reward redeemed",
    rewardReady: "Reward ready to redeem",
    rewardUsed:
      "There’s no reward to redeem. Open your card to check its balance.",
    session:
      "This browser’s card changed. Open the loyalty card and scan again.",
    failed:
      "Couldn’t confirm that action. Try again to check the same attempt.",
    setupFailed: "Couldn’t load the checkout test.",
    retry: "Try again",
    restore: "Wallet return",
    restoreHelp:
      "This test clears the card session in this browser and opens the same recovery screen as the Wallet link. Your stamps stay on the card.",
    restoreStart: "Test returning from Wallet",
    restoreLoading: "Opening the recovery screen…",
    restoreError:
      "Couldn’t open the recovery screen. Check your card before trying again.",
    progress: (stamps: number, goal: number) => `${stamps} of ${goal} stamps`,
  },
  pl: {
    title: "Symulacja kasy",
    demoCard: "Karta demo",
    stamps: "Pieczątki",
    scanTitle: "Zeskanuj kartę",
    scanHint: "Każdy testowy skan dodaje jedną pieczątkę.",
    stampHint: "Pieczątka jest już na Twojej karcie.",
    rewardHint: "Potwierdź odbiór, aby rozpocząć kolejną rundę.",
    nextRound: "Nowa runda, ta sama karta. Zbieraj kolejne pieczątki.",
    demoNotice: "To demonstracja. Żadna prawdziwa nagroda nie zostanie wydana.",
    confirmTitle: "Odebrać nagrodę testową?",
    confirm: "Potwierdź odbiór",
    cancel: "Anuluj",
    eyebrow: "Tylko w trybie deweloperskim",
    intro:
      "Przetestuj skan przy kasie, dodawanie pieczątek i odbiór nagrody. Zmiany dotyczą karty w tej przeglądarce.",
    disabled: "Test karty jest wyłączony w tym lokalu.",
    loading: "Sprawdzamy dostępność testu…",
    needsCard:
      "Załóż kartę w tej przeglądarce, aby przetestować obsługę przy kasie.",
    getCard: "Załóż moją kartę",
    openCard: "Otwórz kartę lojalnościową",
    cardCode: "Kod karty",
    qr: "Kod QR Twojej karty testowej",
    scan: "Symuluj skan przy kasie",
    scanAgain: "Zasymuluj kolejny skan",
    scanning: "Odczytujemy kartę…",
    redeem: "Odbierz nagrodę testową",
    saving: "Zapisujemy zmiany na karcie…",
    added: "Dodano pieczątkę testową",
    redeemed: "Odebrano nagrodę testową",
    rewardReady: "Nagroda do odbioru",
    rewardUsed:
      "Nie ma nagrody do odbioru. Otwórz kartę, aby sprawdzić liczbę pieczątek.",
    session:
      "Karta w tej przeglądarce się zmieniła. Otwórz kartę i zeskanuj ją ponownie.",
    failed:
      "Nie udało się potwierdzić operacji. Spróbuj ponownie, aby sprawdzić tę samą próbę.",
    setupFailed: "Nie udało się wczytać testu karty.",
    retry: "Spróbuj ponownie",
    restore: "Powrót z Portfela",
    restoreHelp:
      "Ten test wyczyści sesję karty w tej przeglądarce i otworzy ten sam ekran odzyskiwania co link w Portfelu. Pieczątki pozostaną na karcie.",
    restoreStart: "Przetestuj powrót z Portfela",
    restoreLoading: "Otwieramy ekran odzyskiwania…",
    restoreError:
      "Nie udało się otworzyć ekranu odzyskiwania. Sprawdź kartę przed ponowną próbą.",
    progress: (stamps: number, goal: number) => `${stamps} z ${goal} pieczątek`,
  },
  ru: {
    title: "Симуляция кассы",
    demoCard: "Демо-карта",
    stamps: "Отметки",
    scanTitle: "Отсканируйте карту",
    scanHint: "Каждое тестовое сканирование добавляет одну отметку.",
    stampHint: "Отметка уже на вашей карте.",
    rewardHint: "Подтвердите получение, чтобы начать новый круг.",
    nextRound: "Новый круг, та же карта. Собирайте следующие отметки.",
    demoNotice: "Это демонстрация. Настоящая награда не выдаётся.",
    confirmTitle: "Получить тестовую награду?",
    confirm: "Подтвердить получение",
    cancel: "Отмена",
    eyebrow: "Только для разработки",
    intro:
      "Попробуйте сканирование на кассе, добавление отметок и получение награды. Изменения затронут карту в этом браузере.",
    disabled: "В этом заведении проверка карты отключена.",
    loading: "Проверяем доступность теста…",
    needsCard: "Получите карту в этом браузере, чтобы проверить её на кассе.",
    getCard: "Получить карту",
    openCard: "Открыть карту лояльности",
    cardCode: "Код карты",
    qr: "QR-код вашей тестовой карты",
    scan: "Имитировать сканирование",
    scanAgain: "Повторить сканирование",
    scanning: "Считываем карту…",
    redeem: "Получить тестовую награду",
    saving: "Сохраняем изменения…",
    added: "Тестовая отметка добавлена",
    redeemed: "Тестовая награда получена",
    rewardReady: "Награда доступна",
    rewardUsed:
      "Доступных наград нет. Откройте карту, чтобы проверить количество отметок.",
    session:
      "Карта в этом браузере изменилась. Откройте карту и отсканируйте её снова.",
    failed:
      "Не удалось подтвердить действие. Повторите попытку, чтобы проверить тот же запрос.",
    setupFailed: "Не удалось загрузить проверку карты.",
    retry: "Попробовать снова",
    restore: "Возврат из Wallet",
    restoreHelp:
      "Тест очистит сеанс карты в этом браузере и откроет тот же экран восстановления, что и ссылка в Wallet. Отметки сохранятся на карте.",
    restoreStart: "Проверить возврат из Wallet",
    restoreLoading: "Открываем экран восстановления…",
    restoreError:
      "Не удалось открыть экран восстановления. Проверьте карту перед повторной попыткой.",
    progress: (stamps: number, goal: number) => `${stamps} из ${goal} отметок`,
  },
} satisfies Record<Language, object>;

function actionIdentifier() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export default function LoyaltyTest({ language }: { language: Language }) {
  const { venue, apiBase } = useVenue();
  const isSweeto = venue.id === "sweeto";
  const t = copy[language];
  const [status, setStatus] = useState<Status>("loading");
  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recoveryEnabled, setRecoveryEnabled] = useState(false);
  const [restore, setRestore] = useState<"idle" | "loading" | "error">("idle");
  const [retry, setRetry] = useState(0);
  const [feedback, setFeedback] = useState<{
    kind: Action;
    actionId: string;
    rewardArrival: boolean;
  }>();
  const [error, setError] = useState<"session" | "rewardUsed" | "failed">();
  const pending = useRef<AbortController | null>(null);
  const attempt = useRef<Attempt | undefined>(undefined);
  const scanTimer = useRef<number | undefined>(undefined);
  const redeemDialog = useRef<HTMLDialogElement>(null);
  const cancelRedeemButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    setStatus("loading");
    setCard(null);
    setScanning(false);
    setBusy(false);
    setRecoveryEnabled(false);
    setRestore("idle");
    setFeedback(undefined);
    setError(undefined);
    attempt.current = undefined;

    async function load() {
      try {
        const info = await guestRequest<{
          enabled: boolean;
          recoveryEnabled?: boolean;
        }>(`${apiBase}/test`, { signal });
        if (signal.aborted) return;
        if (!info.enabled) {
          setStatus("disabled");
          return;
        }
        const result = await guestRequest<{ card: LoyaltyCard | null }>(
          `${apiBase}/loyalty/card`,
          { signal },
        );
        if (!signal.aborted) {
          setCard(result.card);
          setRecoveryEnabled(info.recoveryEnabled === true);
          setStatus("ready");
        }
      } catch {
        if (!signal.aborted) setStatus("error");
      }
    }

    void load();
    return () => {
      controller.abort();
      pending.current?.abort();
      pending.current = null;
      window.clearTimeout(scanTimer.current);
      scanTimer.current = undefined;
    };
  }, [apiBase, retry]);

  function perform(kind: Action) {
    if (
      !card ||
      busy ||
      scanning ||
      pending.current ||
      restore === "loading" ||
      scanTimer.current !== undefined
    )
      return;
    setFeedback(undefined);
    if (
      kind === "redeem" ||
      error === "failed" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      void submit(kind);
      return;
    }
    setScanning(true);
    scanTimer.current = window.setTimeout(() => {
      scanTimer.current = undefined;
      setScanning(false);
      void submit(kind);
    }, scanDuration);
  }

  async function submit(kind: Action) {
    if (status !== "ready" || !card || pending.current || restore === "loading")
      return;
    const controller = new AbortController();
    const code = card.checkout;
    let action = attempt.current;
    if (!action || action.kind !== kind || action.code !== code) {
      action = { kind, code, actionId: actionIdentifier() };
      attempt.current = action;
    }
    pending.current = controller;
    setBusy(true);
    setError(undefined);

    try {
      const response = await fetch(`${apiBase}/test/${kind}`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ code: action.code, actionId: action.actionId }),
      });
      const result: { card?: LoyaltyCard; error?: string } =
        await response.json();
      if (controller.signal.aborted) return;
      if (response.ok && result.card) {
        const updated = result.card;
        if (isSweeto) {
          await observeStampBalance(
            apiBase,
            updated,
            () => !controller.signal.aborted && !document.hidden,
          );
          if (controller.signal.aborted) return;
        }
        const newStamp =
          kind === "stamp" &&
          updated.code === card.code &&
          updated.stamps > card.stamps &&
          updated.visits > card.visits;
        setCard(updated);
        if (newStamp || kind === "redeem") {
          setFeedback({
            kind,
            actionId: action.actionId,
            rewardArrival:
              newStamp && !card.rewardAvailable && updated.rewardAvailable,
          });
        }
        attempt.current = undefined;
      } else if (
        result.error === "card_required" ||
        result.error === "card_not_found"
      ) {
        attempt.current = undefined;
        setCard(null);
        setError("session");
      } else if (result.error === "reward_unavailable") {
        attempt.current = undefined;
        const latest = await guestRequest<{ card: LoyaltyCard | null }>(
          `${apiBase}/loyalty/card`,
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          setCard(latest.card);
          setError("rewardUsed");
        }
      } else {
        if (response.status >= 400 && response.status < 500)
          attempt.current = undefined;
        setError("failed");
      }
    } catch {
      if (!controller.signal.aborted) setError("failed");
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }

  async function simulateWalletReturn() {
    if (
      status !== "ready" ||
      !card ||
      !recoveryEnabled ||
      pending.current ||
      scanning ||
      restore === "loading"
    )
      return;

    const controller = new AbortController();
    pending.current = controller;
    setRestore("loading");
    try {
      const { restorePath } = await guestRequest<{ restorePath: string }>(
        `${apiBase}/test/restore-link`,
        { method: "POST", signal: controller.signal },
      );
      if (controller.signal.aborted) return;

      const url = new URL(restorePath, location.origin);
      if (
        url.origin !== location.origin ||
        url.pathname !== guestPath("restore", venue.id) ||
        url.search ||
        !/^#token=[\w-]{32}\.[1-9]\d{0,14}\.[\w-]{43}$/.test(url.hash)
      ) {
        setRestore("error");
        return;
      }
      location.assign(`${url.pathname}${url.hash}`);
    } catch {
      if (!controller.signal.aborted) setRestore("error");
    } finally {
      if (pending.current === controller) pending.current = null;
    }
  }

  const stampCount = card ? Math.min(card.stamps, card.goal) : 0;
  const nextAction = card?.rewardAvailable ? "redeem" : "stamp";
  const resultText = feedback?.kind === "stamp" ? t.added : t.redeemed;
  const outcomeTitle = scanning
    ? t.scanning
    : busy
      ? t.saving
      : feedback?.kind === "redeem"
        ? t.redeemed
        : card?.rewardAvailable
          ? t.rewardReady
          : feedback?.kind === "stamp"
            ? t.added
            : t.scanTitle;
  const outcomeHint =
    feedback?.kind === "redeem"
      ? t.nextRound
      : card?.rewardAvailable
        ? t.rewardHint
        : feedback?.kind === "stamp"
          ? t.stampHint
          : t.scanHint;
  const announcement = error
    ? ""
    : feedback && card
      ? `${resultText}. ${card.rewardAvailable ? t.rewardReady : t.progress(stampCount, card.goal)}.`
      : "";

  return (
    <section
      className="sweeto-loyalty-test papu-loyalty"
      data-papu-paper={isSweeto || undefined}
      aria-labelledby="loyalty-test-title"
    >
      <h2 id="loyalty-test-title">{t.title}</h2>
      {status === "loading" && <p role="status">{t.loading}</p>}
      {status === "disabled" && <p>{t.disabled}</p>}
      {status === "error" && (
        <>
          <p role="alert">{t.setupFailed}</p>
          <button
            className="sweeto-button"
            type="button"
            onClick={() => setRetry((count) => count + 1)}
          >
            {t.retry}
          </button>
        </>
      )}
      {status === "ready" && (
        <>
          {card ? (
            <>
              <div className="papu-member-pass sweeto-test-ticket">
                <header className="papu-pass-heading sweeto-test-pass-heading">
                  {isSweeto && (
                    <img
                      className="sweeto-test-brand-mark"
                      src="/assets/papupay-mark.svg"
                      width={24}
                      height={26}
                      alt=""
                    />
                  )}
                  <span className="papu-pass-identity">
                    {isSweeto ? t.demoCard : venue.name}
                  </span>
                </header>
                <div className="papu-checkout-stub">
                  <div
                    className="papu-qr-mount sweeto-test-scan-frame"
                    data-scanning={scanning || undefined}
                  >
                    <Suspense fallback={<span role="status">{t.loading}</span>}>
                      <QRCode value={card.checkout} label={t.qr} />
                    </Suspense>
                    {scanning && (
                      <span
                        className="sweeto-test-scan-line"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <p className="papu-checkout-number">
                    <span>{t.cardCode}</span>
                    <code dir="ltr">{card.code}</code>
                  </p>
                </div>
                <div
                  className="papu-member-face"
                  data-reward={card.rewardAvailable || undefined}
                  data-reward-arrival={
                    (isSweeto && !error && feedback?.rewardArrival) || undefined
                  }
                >
                  <div className="papu-stamp-count">
                    <strong>{t.stamps}</strong>
                    <span
                      className="papu-earned-total"
                      aria-label={t.progress(stampCount, card.goal)}
                    >
                      {stampCount} / {card.goal}
                    </span>
                  </div>
                  <ol className="papu-member-stamps" aria-hidden="true">
                    {Array.from({ length: card.goal }, (_, index) => {
                      const earned = index < stampCount;
                      const newest =
                        earned &&
                        feedback?.kind === "stamp" &&
                        index === stampCount - 1;
                      return (
                        <li
                          key={`${index}-${earned}`}
                          className={earned ? "earned" : ""}
                          data-fresh={newest || undefined}
                        >
                          {earned && isSweeto ? (
                            <GuestMotion
                              playKey={newest ? feedback.actionId : undefined}
                            />
                          ) : earned ? (
                            <Check size={18} />
                          ) : index === card.goal - 1 ? (
                            <Gift size={18} strokeWidth={1.7} />
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                  {isSweeto && card.rewardAvailable && (
                    <span className="papu-reward-band" aria-hidden="true" />
                  )}
                </div>
              </div>
              <div className="sweeto-test-outcome">
                <h3>
                  {feedback?.kind === "redeem" && (
                    <Check size={18} aria-hidden="true" />
                  )}
                  {outcomeTitle}
                </h3>
                <p>{outcomeHint}</p>
              </div>
              <div className="sweeto-test-actions" aria-busy={busy || scanning}>
                <button
                  className="sweeto-button sweeto-test-advance"
                  type="button"
                  aria-disabled={busy || scanning || restore === "loading"}
                  onClick={() => {
                    if (
                      busy ||
                      scanning ||
                      restore === "loading" ||
                      pending.current ||
                      scanTimer.current !== undefined
                    )
                      return;
                    if (nextAction === "redeem" && error !== "failed") {
                      redeemDialog.current?.showModal();
                      cancelRedeemButton.current?.focus();
                    } else perform(nextAction);
                  }}
                >
                  <span>
                    {scanning
                      ? t.scanning
                      : busy
                        ? t.saving
                        : error === "failed"
                          ? t.retry
                          : nextAction === "redeem"
                            ? t.redeem
                            : feedback?.kind === "stamp"
                              ? t.scanAgain
                              : t.scan}
                  </span>
                  <span className="papu-action-arrow" aria-hidden="true">
                    {nextAction === "stamp" ? (
                      <ScanLine size={18} />
                    ) : (
                      <Gift size={18} />
                    )}
                  </span>
                </button>
              </div>
              <p className="sweeto-test-notice">{t.demoNotice}</p>
              <dialog
                ref={redeemDialog}
                className="papu-reward-confirm"
                aria-labelledby="papu-reward-confirm-title"
                aria-describedby="papu-reward-confirm-note"
                onCancel={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  redeemDialog.current?.close();
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Escape") return;
                  event.preventDefault();
                  event.stopPropagation();
                  redeemDialog.current?.close();
                }}
              >
                <h3 id="papu-reward-confirm-title">{t.confirmTitle}</h3>
                <p id="papu-reward-confirm-note">{t.rewardHint}</p>
                <button
                  className="sweeto-button papu-reward-confirm-action"
                  type="button"
                  onClick={() => {
                    redeemDialog.current?.close();
                    perform("redeem");
                  }}
                >
                  {t.confirm}
                </button>
                <button
                  className="papu-reward-cancel"
                  ref={cancelRedeemButton}
                  type="button"
                  onClick={() => redeemDialog.current?.close()}
                >
                  {t.cancel}
                </button>
              </dialog>
            </>
          ) : (
            <p>{t.needsCard}</p>
          )}
          <GuestLink
            view="card"
            className={card ? "sweeto-test-back" : "sweeto-button"}
          >
            {card ? t.openCard : t.getCard}
            <ArrowRight size={17} aria-hidden="true" />
          </GuestLink>
          {card && recoveryEnabled && (
            <details>
              <summary className="sweeto-test-back">
                {t.restore}
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <p className="sweeto-test-intro">{t.restoreHelp}</p>
              <button
                className="sweeto-wallet-secondary"
                type="button"
                disabled={busy || scanning || restore === "loading"}
                onClick={() => void simulateWalletReturn()}
              >
                {restore === "loading" ? t.restoreLoading : t.restoreStart}
              </button>
              {restore === "error" && (
                <p className="sweeto-error" role="alert">
                  {t.restoreError}
                </p>
              )}
            </details>
          )}
        </>
      )}
      {error && (
        <p className="sweeto-error" role="alert">
          {t[error]}
        </p>
      )}
      <span className="sweeto-sr-only" role="status">
        {announcement}
      </span>
    </section>
  );
}
