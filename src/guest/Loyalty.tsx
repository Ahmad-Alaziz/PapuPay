import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "papu-guest-motion/react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  Gift,
  RefreshCw,
  ScanLine,
  BadgeCheck,
  WalletCards,
} from "papu-guest-icons";
import type { Language } from "./catalog";
import { copy } from "./copy";
import GuestMotion from "../GuestMotion";
import { observeStampBalance } from "./stampObservation";
import {
  guestRequest,
  isGuestServiceUnavailable,
  type LoyaltyCard,
} from "./api";
import { GuestLink, useVenue } from "./VenueContext";
import "./wallet.css";
import "./loyalty-card.css";

type CardResponse = { card: LoyaltyCard | null };
type WalletAvailability = {
  status: "unconfigured" | "requires_card" | "ready";
  passUrl: string | null;
  updatesEnabled?: boolean;
};
type CodeRenderer = (typeof import("./QRCode"))["default"];
// Keep creation shared when the guest closes and reopens the sheet mid-request.
const pendingJoins = new Map<string, Promise<CardResponse>>();
function joinCard(cardPath: string) {
  const pending = pendingJoins.get(cardPath);
  if (pending) return pending;
  const request = guestRequest<CardResponse>(cardPath, {
    method: "POST",
  }).finally(() => {
    pendingJoins.delete(cardPath);
  });
  pendingJoins.set(cardPath, request);
  return request;
}
const cardLinks = {
  en: {
    wallet: "Add to Apple Wallet",
    walletManual: "Add it again to refresh your Wallet balance",
    walletAutomatic: "Stamps update automatically in Wallet",
    walletPreview: "Preview Wallet pass",
    test: "Try checkout simulation",
    title: "Stamp card",
    paperTitle: "Stamp card",
    demoCard: "Demo card",
    demoJoin: "Create a demo card",
    demoNotice: "Demo card · test rewards",
    checkout: "Show at the counter",
    firstStamp: "Show this code for your first stamp",
    claimReward: "Show this code to claim your reward",
    cardNumber: "Card number",
    useNumber: "Use the card number below",
    rewardReady: "Reward ready",
    receipt: (n: number) =>
      n === 1 ? "Stamp collected." : `${n} stamps collected.`,
    lastBalance: "Last known balance",
    stale: "Couldn’t refresh your stamps. Your code is still available.",
    nouns: { one: "stamp", few: "stamps", other: "stamps" },
    untilReward: (n: number, noun: string) => `${n} ${noun} to your reward`,
    unavailable: "Loyalty is temporarily unavailable at this venue.",
  },
  pl: {
    wallet: "Dodaj do Portfela Apple",
    walletManual: "Dodaj kartę ponownie, aby odświeżyć stan pieczątek",
    walletAutomatic: "Pieczątki w Portfelu aktualizują się automatycznie",
    walletPreview: "Podgląd karty w Wallet",
    test: "Wypróbuj symulację kasy",
    title: "Karta gościa",
    paperTitle: "Karta na pieczątki",
    demoCard: "Karta demo",
    demoJoin: "Utwórz kartę demo",
    demoNotice: "Karta demonstracyjna · nagrody testowe",
    checkout: "Pokaż przy kasie",
    firstStamp: "Pokaż kod, by zebrać pierwszą pieczątkę",
    claimReward: "Pokaż kod, by odebrać nagrodę",
    cardNumber: "Numer karty",
    useNumber: "Podaj numer karty przy kasie",
    rewardReady: "Nagroda do odbioru",
    receipt: (n: number) =>
      n === 1 ? "Pieczątka dodana." : `Nowe pieczątki: ${n}.`,
    lastBalance: "Ostatni znany stan karty",
    stale: "Nie udało się odświeżyć pieczątek. Nadal możesz pokazać kod.",
    nouns: { one: "pieczątka", few: "pieczątki", other: "pieczątek" },
    untilReward: (n: number, noun: string) => `${n} ${noun} do nagrody`,
    unavailable: "Karty lojalnościowe są chwilowo niedostępne w tym lokalu.",
  },
  ru: {
    wallet: "Добавить в Apple Wallet",
    walletManual: "Добавьте карту заново, чтобы обновить баланс",
    walletAutomatic: "Отметки обновляются в Wallet автоматически",
    walletPreview: "Предпросмотр карты Wallet",
    test: "Попробовать симуляцию кассы",
    title: "Карта гостя",
    paperTitle: "Карта отметок",
    demoCard: "Демо-карта",
    demoJoin: "Создать демо-карту",
    demoNotice: "Демо-карта · тестовые награды",
    checkout: "Покажите на кассе",
    firstStamp: "Покажите код для первой отметки",
    claimReward: "Покажите код, чтобы забрать награду",
    cardNumber: "Номер карты",
    useNumber: "Назовите номер карты на кассе",
    rewardReady: "Награда готова",
    receipt: (n: number) =>
      n === 1 ? "Отметка получена." : `Новых отметок: ${n}.`,
    lastBalance: "При последнем обновлении",
    stale: "Не удалось обновить отметки. Код по-прежнему доступен.",
    nouns: { one: "отметка", few: "отметки", other: "отметок" },
    untilReward: (n: number, noun: string) => `Ещё ${n} ${noun} до награды`,
    unavailable: "Карты лояльности временно недоступны в этом заведении.",
  },
};

function rewardProgress(card: LoyaltyCard, language: Language) {
  const labels = cardLinks[language];
  if (card.rewardAvailable) return labels.rewardReady;
  const remaining = Math.max(0, card.goal - card.stamps);
  const plural = new Intl.PluralRules(language).select(remaining);
  const noun =
    labels.nouns[plural === "one" || plural === "few" ? plural : "other"];
  return labels.untilReward(remaining, noun);
}

function PassIdentity({ name, logo }: { name: string; logo?: string }) {
  return logo ? (
    <img className="papu-pass-identity" src={logo} alt={name} />
  ) : (
    <span className="papu-pass-identity">{name}</span>
  );
}

export default function Loyalty({ language }: { language: Language }) {
  const { venue, apiBase } = useVenue();
  const isSweeto = venue.id === "sweeto";
  const cardPath = `${apiBase}/loyalty/card`;
  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "error" | "unavailable"
  >("loading");
  const [QRCode, setQRCode] = useState<
    CodeRenderer | "loading" | "unavailable"
  >("loading");
  const [qrAttempt, setQrAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [receipt, setReceipt] = useState<{ count: number; key: string } | null>(
    null,
  );
  const [rewardArrival, setRewardArrival] = useState(false);
  const [testAvailable, setTestAvailable] = useState(false);
  const [wallet, setWallet] = useState<{
    path: string;
    code: string;
    pass: WalletAvailability;
  }>();
  const current = useRef<LoyaltyCard | null>(null);
  const request = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const focusCreatedCard = useRef(false);
  const t = copy[language];
  const labels = cardLinks[language];
  const cardCode = card?.code;
  const expectedPass = `${apiBase}/loyalty/apple-wallet.pkpass`;
  const walletPass =
    wallet?.path === apiBase &&
    wallet.code === cardCode &&
    wallet.pass.status === "ready" &&
    wallet.pass.passUrl === expectedPass
      ? wallet.pass
      : null;
  const focusHeading = useCallback((heading: HTMLHeadingElement | null) => {
    if (heading && focusCreatedCard.current) {
      focusCreatedCard.current = false;
      heading.focus();
    }
  }, []);
  // Start the encoder alongside the card request so a confirmed card can scan immediately.
  useEffect(() => {
    let active = true;
    void import("./QRCode").then(
      ({ default: Code }) => {
        if (active) setQRCode(() => Code);
      },
      () => {
        if (active) setQRCode("unavailable");
      },
    );
    return () => {
      active = false;
    };
  }, [qrAttempt]);
  const load = useCallback(
    async (silent = false) => {
      if (silent && pending.current) return;
      pending.current?.abort();
      const controller = new AbortController();
      pending.current = controller;
      const id = ++request.current;
      if (!silent) setRefreshing(true);
      try {
        const { card: next } = await (pendingJoins.get(cardPath) ??
          guestRequest<CardResponse>(cardPath, { signal: controller.signal }));
        if (id !== request.current) return;
        const previous = current.current;
        const isVisibleRequest = () =>
          id === request.current && !document.hidden;
        if (isSweeto && !isVisibleRequest()) return;
        const observation = isSweeto
          ? await observeStampBalance(apiBase, next, isVisibleRequest)
          : null;
        if (id !== request.current || (isSweeto && document.hidden)) return;
        if (observation?.kind === "stale" && next) {
          // Keep the newer confirmed balance and the server-supplied scannable QR.
          const { goal, visits, stamps } = observation.previous;
          const last = {
            ...next,
            stamps,
            visits,
            goal,
            rewardAvailable: stamps === goal,
          };
          current.current = last;
          setCard(last);
          setStatus("ready");
          setError(true);
          setReceipt(null);
          setRewardArrival(false);
          return;
        }
        const gained = isSweeto
          ? observation?.kind === "earned"
            ? observation.count
            : 0
          : next &&
              previous?.code === next.code &&
              next.stamps > previous.stamps &&
              next.visits > previous.visits
            ? 1
            : 0;
        if (gained && next) {
          setReceipt({
            count: gained,
            key: next.visits + "-" + next.updatedAt,
          });
          setRewardArrival(next.rewardAvailable && !previous?.rewardAvailable);
        } else if (
          !next ||
          next.checkout !== previous?.checkout ||
          next.stamps !== previous.stamps
        ) {
          setReceipt(null);
          setRewardArrival(false);
        }
        current.current = next;
        setCard(next);
        setStatus("ready");
        setError(false);
      } catch (failure) {
        if (id === request.current && !controller.signal.aborted) {
          if (current.current) {
            setReceipt(null);
            setRewardArrival(false);
            setError(true);
          } else if (!silent)
            setStatus(
              isGuestServiceUnavailable(failure) ? "unavailable" : "error",
            );
        }
      } finally {
        if (pending.current === controller) pending.current = null;
        if (id === request.current) setRefreshing(false);
      }
    },
    [apiBase, cardPath, isSweeto],
  );
  useEffect(() => {
    current.current = null;
    setCard(null);
    setStatus("loading");
    setReceipt(null);
    setRewardArrival(false);
    setSaving(false);
    setError(false);
    void load();
    function poll() {
      if (current.current && !document.hidden) void load(true);
    }
    function visibilityChanged() {
      if (document.hidden && isSweeto) {
        setReceipt(null);
        setRewardArrival(false);
      } else if (!document.hidden && (isSweeto || current.current)) void load();
    }
    document.addEventListener("visibilitychange", visibilityChanged);
    const id = window.setInterval(poll, 3000);
    return () => {
      request.current += 1;
      pending.current?.abort();
      pending.current = null;
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.clearInterval(id);
    };
  }, [isSweeto, load]);
  useEffect(() => {
    const controller = new AbortController();
    setTestAvailable(false);
    void guestRequest<{ enabled: boolean }>(`${apiBase}/test`, {
      signal: controller.signal,
    })
      .then(({ enabled }) => {
        if (!controller.signal.aborted) setTestAvailable(enabled === true);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [apiBase]);
  useEffect(() => {
    if (!cardCode) return;
    const controller = new AbortController();
    void guestRequest<WalletAvailability>(`${apiBase}/loyalty/wallet`, {
      signal: controller.signal,
    })
      .then((pass) => {
        if (!controller.signal.aborted) {
          setWallet({ path: apiBase, code: cardCode, pass });
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [apiBase, cardCode]);
  useEffect(() => {
    if (isSweeto || !receipt) return;
    const id = window.setTimeout(() => {
      setReceipt(null);
      setRewardArrival(false);
    }, 4200);
    return () => window.clearTimeout(id);
  }, [isSweeto, receipt]);
  async function join() {
    const id = ++request.current;
    setSaving(true);
    setError(false);
    try {
      const { card: created } = await joinCard(cardPath);
      if (id !== request.current) return;
      if (!created) throw new Error("Missing card");
      if (isSweeto) {
        await observeStampBalance(
          apiBase,
          created,
          () => id === request.current && !document.hidden,
        );
        if (id !== request.current) return;
      }
      current.current = created;
      focusCreatedCard.current = true;
      setCard(created);
    } catch (failure) {
      if (id === request.current) {
        if (isGuestServiceUnavailable(failure)) setStatus("unavailable");
        else setError(true);
      }
    } finally {
      if (id === request.current) setSaving(false);
    }
  }
  const cardMeta = (
    <div className="sweeto-card-meta">
      <span
        role="status"
        aria-atomic="true"
        className={
          isSweeto && !error && receipt ? "papu-stamp-receipt" : undefined
        }
      >
        {isSweeto && !error && receipt && (
          <BadgeCheck size={16} aria-hidden="true" />
        )}
        {error
          ? labels.stale
          : receipt
            ? isSweeto
              ? labels.receipt(receipt.count)
              : t.stampAdded
            : t.cardSaved}
      </span>
      <button
        className="sweeto-refresh"
        type="button"
        disabled={refreshing}
        onClick={() => {
          if (QRCode === "unavailable") setQrAttempt((attempt) => attempt + 1);
          void load();
        }}
      >
        <RefreshCw size={15} className={refreshing ? "sweeto-spinning" : ""} />
        {t.refresh}
      </button>
    </div>
  );
  return (
    <section
      className="sweeto-loyalty papu-loyalty"
      data-papu-paper={isSweeto || undefined}
      aria-labelledby="papu-loyalty-title"
    >
      {isSweeto && status === "loading" && !card ? (
        <p role="status" className="sweeto-loading">
          {t.loading}
        </p>
      ) : card ? (
        <div key="card">
          <div
            className="papu-member-pass"
            data-reward={(!error && card.rewardAvailable) || undefined}
          >
            <header className="papu-pass-heading">
              {isSweeto ? (
                <span className="papu-pass-identity">
                  {testAvailable ? labels.demoCard : labels.paperTitle}
                </span>
              ) : (
                <PassIdentity name={venue.name} logo={venue.logoWhiteUrl} />
              )}
              <h2 id="papu-loyalty-title" tabIndex={-1} ref={focusHeading}>
                {labels.checkout}
              </h2>
            </header>
            <div className="papu-checkout-stub">
              {!isSweeto &&
                !error &&
                (card.rewardAvailable || card.visits === 0) && (
                  <p className="papu-checkout-prompt">
                    {card.rewardAvailable
                      ? labels.claimReward
                      : labels.firstStamp}
                  </p>
                )}
              <div
                className="papu-qr-mount"
                data-unavailable={QRCode === "unavailable" || undefined}
              >
                {typeof QRCode === "function" ? (
                  <QRCode value={card.checkout} label={t.qr} />
                ) : (
                  <span role="status">
                    {QRCode === "unavailable"
                      ? labels.useNumber
                      : t.loadingCode}
                  </span>
                )}
              </div>
              <p className="papu-checkout-number">
                <span>{labels.cardNumber}</span>{" "}
                <code dir="ltr">{card.code}</code>
              </p>
            </div>
            <div
              className="papu-member-face"
              data-reward={(!error && card.rewardAvailable) || undefined}
              data-reward-arrival={
                (isSweeto && !error && rewardArrival && !!receipt) || undefined
              }
            >
              <div
                className="papu-stamp-count"
                role="status"
                aria-atomic="true"
              >
                <strong>
                  {error ? labels.lastBalance : rewardProgress(card, language)}
                </strong>
                <span className="papu-earned-total">
                  {`${card.stamps} ${t.from} ${card.goal}`}
                  <span className="sweeto-sr-only">{` ${t.progress}`}</span>
                </span>
              </div>
              <ol className="papu-member-stamps" aria-hidden="true">
                {Array.from({ length: card.goal }, (_, i) => {
                  const earned = i < card.stamps;
                  const newest =
                    !!receipt && i === Math.min(card.stamps, card.goal) - 1;
                  return (
                    <li
                      key={`${i}-${earned}`}
                      className={earned ? "earned" : ""}
                      data-fresh={newest || undefined}
                    >
                      {earned ? (
                        <GuestMotion
                          playKey={newest ? receipt.key : undefined}
                        />
                      ) : i === card.goal - 1 ? (
                        <Gift size={18} strokeWidth={1.7} />
                      ) : null}
                    </li>
                  );
                })}
              </ol>
              {isSweeto && cardMeta}
              {isSweeto && !error && card.rewardAvailable && (
                <span className="papu-reward-band" aria-hidden="true" />
              )}
            </div>
            {(walletPass || testAvailable) && (
              <div className="papu-loyalty-wallet">
                {walletPass ? (
                  <>
                    <a className="papu-loyalty-save" href={expectedPass}>
                      <span>{labels.wallet}</span>
                      <span className="papu-action-arrow" aria-hidden="true">
                        <ArrowDownToLine size={17} />
                      </span>
                    </a>
                    <GuestLink
                      className="papu-loyalty-wallet-details"
                      view="wallet"
                    >
                      {walletPass.updatesEnabled
                        ? labels.walletAutomatic
                        : labels.walletManual}
                      <ArrowRight size={14} aria-hidden="true" />
                    </GuestLink>
                  </>
                ) : (
                  <GuestLink className="papu-loyalty-save" view="wallet">
                    <span>{labels.walletPreview}</span>
                    <span className="papu-action-arrow" aria-hidden="true">
                      <WalletCards size={17} />
                    </span>
                  </GuestLink>
                )}
              </div>
            )}
          </div>
          {!isSweeto && cardMeta}
        </div>
      ) : (
        <div key="join">
          <div className="papu-member-pass">
            <header className="papu-pass-heading">
              {isSweeto ? (
                <span className="papu-pass-identity">
                  {testAvailable ? labels.demoCard : venue.name}
                </span>
              ) : (
                <PassIdentity name={venue.name} logo={venue.logoWhiteUrl} />
              )}
              <h2 id="papu-loyalty-title">
                {isSweeto
                  ? labels.paperTitle
                  : status === "ready"
                    ? t.joinIntro
                    : labels.title}
              </h2>
              {isSweeto && status === "ready" && (
                <span className="papu-join-seal" aria-hidden="true">
                  <GuestMotion />
                </span>
              )}
            </header>
            {status === "ready" && (
              <>
                <div className="papu-join-illustration" aria-hidden="true">
                  <ol className="papu-member-stamps">
                    {Array.from({ length: 5 }, (_, i) => (
                      <li key={i} />
                    ))}
                    <li>
                      <Gift size={18} strokeWidth={1.7} />
                    </li>
                  </ol>
                </div>
                <div className="papu-join-actions">
                  <p className="sweeto-join-description">{t.joinText}</p>
                  <motion.button
                    className="sweeto-button sweeto-join"
                    type="button"
                    disabled={saving}
                    onClick={() => void join()}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span aria-live="polite">
                      {saving
                        ? t.creating
                        : isSweeto && testAvailable
                          ? labels.demoJoin
                          : t.join}
                    </span>
                    <span className="papu-action-arrow" aria-hidden="true">
                      <ArrowRight size={17} />
                    </span>
                  </motion.button>
                  <p className="sweeto-no-account">
                    <Check size={15} aria-hidden="true" />
                    {t.noAccount}
                  </p>
                </div>
              </>
            )}
            {status === "loading" && (
              <p role="status" className="sweeto-loading">
                {t.loading}
              </p>
            )}
            {(status === "error" || status === "unavailable") && (
              <div className="papu-join-actions">
                <p className="sweeto-error" role="alert">
                  {status === "unavailable" ? labels.unavailable : t.connection}
                </p>
                <button
                  className="sweeto-button sweeto-join"
                  type="button"
                  disabled={refreshing}
                  onClick={() => void load()}
                >
                  {t.retry}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {(card || status === "ready") && (
        <p className="sweeto-card-terms">
          {isSweeto && testAvailable ? labels.demoNotice : t.terms}
        </p>
      )}
      {card && testAvailable && (
        <GuestLink className="sweeto-test-link" view="test">
          <ScanLine size={18} aria-hidden="true" />
          <span>{labels.test}</span>
          <ArrowRight size={16} aria-hidden="true" />
        </GuestLink>
      )}
      {error && !card && status === "ready" && (
        <p className="sweeto-error" role="alert">
          {t.connection}
        </p>
      )}
    </section>
  );
}
