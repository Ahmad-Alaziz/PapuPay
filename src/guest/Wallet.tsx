import {
  ArrowDownToLine,
  ArrowRight,
  CakeSlice,
  Gift,
  QrCode,
} from "papu-guest-icons";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { Language } from "./catalog";
import {
  guestRequest,
  isGuestServiceUnavailable,
  type LoyaltyCard,
} from "./api";
import { GuestLink, useVenue } from "./VenueContext";
import WalletPocket from "./WalletPocket";
import PapayaMark from "./PapayaMark";
import "./guest-flow.css";
import "./wallet.css";

const QRCode = lazy(() => import("./QRCode"));

type WalletResponse = {
  status: "unconfigured" | "requires_card" | "ready";
  passUrl: string | null;
  updatesEnabled?: boolean;
  recoveryEnabled?: boolean;
};

const copy = {
  en: {
    title: "Apple Wallet",
    preview: "Pass preview",
    stamps: "Stamps",
    reward: "Reward ready",
    qr: "Checkout QR code for your loyalty card",
    ready: "Open the pass on your iPhone, then tap Add.",
    refresh:
      "Download a fresh pass when you want to see your latest stamp balance in Wallet.",
    automatic: "Your stamp balance updates automatically in Wallet.",
    recovery: "To reopen your card, use the browser link in your saved pass.",
    unavailable:
      "Apple Wallet is unavailable at this venue. Your browser card works for stamps and rewards.",
    browserOnly:
      "Apple Wallet is unavailable here. You can still get a card in your browser.",
    requiresCard:
      "Get a loyalty card first, then return here to save it on your iPhone.",
    download: "Add to Apple Wallet",
    openCard: "Open loyalty card",
    getCard: "Get my card",
    loading: "Checking Wallet availability…",
    error: "Couldn’t check Wallet availability. Try again in a moment.",
    serviceUnavailable:
      "Wallet passes are temporarily unavailable at this venue.",
    retry: "Try again",
  },
  pl: {
    title: "Portfel Apple",
    preview: "Podgląd karty",
    stamps: "Pieczątki",
    reward: "Nagroda do odbioru",
    qr: "Kod QR karty lojalnościowej do pokazania przy kasie",
    ready: "Otwórz kartę na iPhonie i stuknij Dodaj.",
    refresh:
      "Pobierz kartę ponownie, aby zobaczyć aktualną liczbę pieczątek w Portfelu.",
    automatic: "Liczba pieczątek aktualizuje się automatycznie w Portfelu.",
    recovery:
      "Aby wrócić do karty, skorzystaj z linku w zapisanej karcie w Portfelu.",
    unavailable:
      "Portfel Apple jest niedostępny w tym lokalu. Nadal możesz zbierać pieczątki i odbierać nagrody z kartą w przeglądarce.",
    browserOnly:
      "Portfel Apple jest tu niedostępny. Nadal możesz założyć kartę w przeglądarce.",
    requiresCard:
      "Najpierw załóż kartę lojalnościową, a potem wróć tutaj, aby zapisać ją na iPhonie.",
    download: "Dodaj do Portfela Apple",
    openCard: "Otwórz kartę lojalnościową",
    getCard: "Załóż moją kartę",
    loading: "Sprawdzamy dostępność Portfela…",
    error:
      "Nie udało się sprawdzić dostępności Portfela. Spróbuj ponownie za chwilę.",
    serviceUnavailable:
      "Karty do Portfela są chwilowo niedostępne w tym lokalu.",
    retry: "Spróbuj ponownie",
  },
  ru: {
    title: "Apple Wallet",
    preview: "Предпросмотр карты",
    stamps: "Отметки",
    reward: "Награда готова",
    qr: "QR-код карты лояльности для предъявления на кассе",
    ready: "Откройте карту на iPhone и нажмите «Добавить».",
    refresh:
      "Скачайте карту заново, если хотите увидеть актуальное число отметок в Wallet.",
    automatic: "Количество отметок в Wallet обновляется автоматически.",
    recovery:
      "Чтобы снова открыть карту, перейдите по ссылке в сохранённой карте Wallet.",
    unavailable:
      "Apple Wallet недоступен в этом заведении. Вы можете собирать отметки и получать награды с картой в браузере.",
    browserOnly:
      "Apple Wallet здесь недоступен. Вы можете получить карту в браузере.",
    requiresCard:
      "Сначала получите карту лояльности, а затем вернитесь сюда, чтобы сохранить её на iPhone.",
    download: "Добавить в Apple Wallet",
    openCard: "Открыть карту лояльности",
    getCard: "Получить карту",
    loading: "Проверяем доступность Wallet…",
    error:
      "Не удалось проверить доступность Wallet. Попробуйте ещё раз чуть позже.",
    serviceUnavailable:
      "Карты для Wallet временно недоступны в этом заведении.",
    retry: "Попробовать снова",
  },
} satisfies Record<Language, object>;

export default function Wallet({ language }: { language: Language }) {
  const { venue, apiBase } = useVenue();
  const t = copy[language];
  const [wallet, setWallet] = useState<
    WalletResponse | "loading" | "error" | "unavailable"
  >("loading");
  const [preview, setPreview] = useState<{
    apiBase: string;
    card: LoyaltyCard | null;
  }>();
  const [attempt, setAttempt] = useState(0);
  const [handoff, setHandoff] = useState(false);
  const handoffTimeout = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(handoffTimeout.current), []);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    setWallet("loading");

    void guestRequest<WalletResponse>(`${apiBase}/loyalty/wallet`, { signal })
      .then((result) => {
        if (!signal.aborted) setWallet(result);
      })
      .catch((failure) => {
        if (!signal.aborted)
          setWallet(
            isGuestServiceUnavailable(failure) ? "unavailable" : "error",
          );
      });
    void guestRequest<{ card: LoyaltyCard | null }>(`${apiBase}/loyalty/card`, {
      signal,
    })
      .then((result) => {
        if (!signal.aborted) setPreview({ apiBase, card: result.card });
      })
      .catch(() => {});

    return () => controller.abort();
  }, [apiBase, attempt]);

  const status = typeof wallet === "string" ? wallet : wallet.status;
  const card = preview?.apiBase === apiBase ? preview.card : null;
  const expectedPass = `${apiBase}/loyalty/apple-wallet.pkpass`;
  const canDownload =
    typeof wallet === "object" &&
    status === "ready" &&
    wallet.passUrl === expectedPass;
  const requiresCard = status === "requires_card";
  const cardNeeded =
    requiresCard ||
    (status !== "ready" && preview?.apiBase === apiBase && !card);
  const canRetry = status === "error" || status === "unavailable";
  const updatesEnabled = canDownload && wallet.updatesEnabled === true;

  function showHandoff() {
    window.clearTimeout(handoffTimeout.current);
    setHandoff(true);
    handoffTimeout.current = window.setTimeout(() => setHandoff(false), 880);
  }

  return (
    <section
      className="sweeto-wallet papu-wallet"
      aria-labelledby="wallet-title"
    >
      <header className="papu-flow-heading papu-wallet-heading">
        <h2 id="wallet-title">{t.title}</h2>
      </header>
      <div className="papu-wallet-stage" role="group" aria-label={t.preview}>
        <div className="papu-wallet-preview">
          <div className="papu-wallet-preview-brand">
            {venue.id === "sweeto" ? (
              <>
                <span className="papu-wallet-wordmark">
                  <PapayaMark />
                  Papu<span>Pay</span>
                </span>
                <span className="papu-wallet-venue">{venue.name}</span>
              </>
            ) : venue.logoWhiteUrl ? (
              <img src={venue.logoWhiteUrl} alt={venue.name} />
            ) : (
              <strong>{venue.name}</strong>
            )}
          </div>
          {card && (
            <div className="papu-wallet-strip">
              {card.goal > 0 && card.goal <= 8 && (
                <div className="papu-wallet-punches" aria-hidden="true">
                  {Array.from({ length: card.goal }, (_, index) => (
                    <span
                      key={index}
                      data-earned={index < card.stamps || undefined}
                      data-reward={index === card.goal - 1 || undefined}
                    >
                      {venue.id === "sweeto" && index < card.stamps ? (
                        <img
                          src="/assets/sweeto/sweeto-pass.webp"
                          alt=""
                          width="40"
                          height="40"
                        />
                      ) : index === card.goal - 1 ? (
                        <Gift />
                      ) : index < card.stamps ? (
                        <CakeSlice />
                      ) : null}
                    </span>
                  ))}
                </div>
              )}
              <p>
                {card.rewardAvailable
                  ? t.reward
                  : `${t.stamps} ${card.stamps} / ${card.goal}`}
              </p>
            </div>
          )}
          <div className="papu-wallet-fields">
            {card ? (
              <div className="papu-wallet-barcode">
                <Suspense
                  fallback={
                    <div
                      className="papu-wallet-barcode-placeholder"
                      aria-hidden="true"
                    />
                  }
                >
                  <QRCode
                    key={card.checkout}
                    value={card.checkout}
                    label={t.qr}
                  />
                </Suspense>
                <code>{card.code}</code>
              </div>
            ) : (
              <div className="papu-wallet-placeholder" aria-hidden="true">
                <QrCode size={34} strokeWidth={1.35} />
              </div>
            )}
          </div>
        </div>
      </div>

      {status === "loading" && (
        <p className="sweeto-wallet-note" role="status">
          {t.loading}
        </p>
      )}
      {canRetry && (
        <>
          <p className="sweeto-wallet-note" role="alert">
            {status === "unavailable" ? t.serviceUnavailable : t.error}
          </p>
          <button
            className="sweeto-wallet-secondary"
            type="button"
            onClick={() => setAttempt((count) => count + 1)}
          >
            {t.retry}
          </button>
        </>
      )}
      {canDownload ? (
        <div className="papu-wallet-save">
          <div className="papu-wallet-save-info">
            <WalletPocket handoff={handoff} />
            <p className="sweeto-wallet-note">{t.ready}</p>
          </div>
          <a
            className="sweeto-button sweeto-wallet-download"
            href={expectedPass}
            onClick={showHandoff}
          >
            {t.download}
            <span className="papu-action-arrow" aria-hidden="true">
              <ArrowDownToLine size={17} />
            </span>
          </a>
          <small className="sweeto-wallet-refresh-note">
            {updatesEnabled ? t.automatic : t.refresh}
          </small>
          {wallet.recoveryEnabled === true && (
            <small className="sweeto-wallet-refresh-note">{t.recovery}</small>
          )}
        </div>
      ) : (
        (status === "unconfigured" || status === "ready" || requiresCard) && (
          <p className="sweeto-wallet-note">
            {requiresCard
              ? t.requiresCard
              : cardNeeded
                ? t.browserOnly
                : t.unavailable}
          </p>
        )
      )}
      {status !== "loading" && (
        <GuestLink
          view="card"
          className={
            canDownload || canRetry
              ? "sweeto-wallet-secondary"
              : "sweeto-button sweeto-wallet-download"
          }
        >
          {cardNeeded ? t.getCard : t.openCard}
          <ArrowRight size={17} aria-hidden="true" />
        </GuestLink>
      )}
    </section>
  );
}
