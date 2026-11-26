import { ArrowRight, CakeSlice, Gift, QrCode } from "papu-guest-icons";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { Language } from "./catalog";
import {
  guestRequest,
  isGuestServiceUnavailable,
  type LoyaltyCard,
} from "./api";
import { GuestLink, useVenue } from "./VenueContext";
import WalletPocket from "./WalletPocket";
import { AppleWalletLink, GoogleWalletButton } from "./WalletActions";
import {
  canOpenAppleWallet,
  readWalletAvailability,
  type WalletAvailability,
} from "./walletAvailability";
import PapayaMark from "./PapayaMark";
import "./guest-flow.css";
import "./wallet.css";

const QRCode = lazy(() => import("./QRCode"));

const copy = {
  en: {
    title: "Save your pass",
    preview: "Pass preview",
    stamps: "Stamps",
    reward: "Reward ready",
    qr: "Checkout QR code for your loyalty card",
    ready: "Show the saved pass at the counter on your next visit.",
    appleOtherDevice:
      "Open the downloaded pass on an iPhone or Mac to add it to Apple Wallet.",
    refresh:
      "Download a fresh pass when you want to see your latest stamp balance in Wallet.",
    automatic: "Your stamp balance updates automatically in Wallet.",
    recovery: "To reopen your card, use the browser link in your saved pass.",
    unavailable:
      "Wallet passes are unavailable at this venue. You can show your browser card at the counter.",
    browserOnly:
      "You can collect stamps and rewards with a card in your browser.",
    requiresCard:
      "Get your loyalty card first, then return here to save it to your wallet.",
    openCard: "Open loyalty card",
    getCard: "Get my card",
    loading: "Checking Wallet availability…",
    error: "Couldn’t check Wallet availability. Try again in a moment.",
    serviceUnavailable:
      "Wallet passes are temporarily unavailable at this venue.",
    retry: "Try again",
  },
  pl: {
    title: "Zapisz kartę",
    preview: "Podgląd karty",
    stamps: "Pieczątki",
    reward: "Nagroda do odbioru",
    qr: "Kod QR karty lojalnościowej do pokazania przy kasie",
    ready: "Przy kolejnej wizycie pokaż zapisaną kartę przy kasie.",
    appleOtherDevice:
      "Otwórz pobraną kartę na iPhonie lub Macu, aby dodać ją do Portfela Apple.",
    refresh:
      "Pobierz kartę ponownie, aby zobaczyć aktualną liczbę pieczątek w Portfelu.",
    automatic: "Liczba pieczątek aktualizuje się automatycznie w Portfelu.",
    recovery:
      "Aby wrócić do karty, skorzystaj z linku w zapisanej karcie w Portfelu.",
    unavailable:
      "Karty do portfela są niedostępne w tym lokalu. Możesz pokazać kartę z przeglądarki przy kasie.",
    browserOnly: "Zbieraj pieczątki i odbieraj nagrody z kartą w przeglądarce.",
    requiresCard:
      "Najpierw załóż kartę lojalnościową, a potem wróć tutaj, aby zapisać ją w portfelu.",
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
    title: "Сохраните карту",
    preview: "Предпросмотр карты",
    stamps: "Отметки",
    reward: "Награда готова",
    qr: "QR-код карты лояльности для предъявления на кассе",
    ready: "При следующем визите покажите сохранённую карту на кассе.",
    appleOtherDevice:
      "Откройте загруженную карту на iPhone или Mac, чтобы добавить её в Apple Wallet.",
    refresh:
      "Скачайте карту заново, если хотите увидеть актуальное число отметок в Wallet.",
    automatic: "Количество отметок в Wallet обновляется автоматически.",
    recovery:
      "Чтобы снова открыть карту, перейдите по ссылке в сохранённой карте Wallet.",
    unavailable:
      "Сохранение в кошелёк недоступно в этом заведении. Вы можете показать карту из браузера на кассе.",
    browserOnly:
      "С картой в браузере можно собирать отметки и получать награды.",
    requiresCard:
      "Сначала получите карту лояльности, затем вернитесь сюда, чтобы сохранить её в кошельке.",
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
  const [wallet, setWallet] = useState<{
    apiBase: string;
    result: WalletAvailability | "loading" | "error" | "unavailable";
  }>();
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
    setWallet({ apiBase, result: "loading" });

    void guestRequest<unknown>(`${apiBase}/loyalty/wallet`, { signal })
      .then((result) => {
        if (!signal.aborted)
          setWallet({
            apiBase,
            result: readWalletAvailability(result, apiBase),
          });
      })
      .catch((failure) => {
        if (!signal.aborted)
          setWallet({
            apiBase,
            result: isGuestServiceUnavailable(failure)
              ? "unavailable"
              : "error",
          });
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

  const result = wallet?.apiBase === apiBase ? wallet.result : "loading";
  const providers = typeof result === "object" ? result : null;
  const status = typeof result === "string" ? result : result.status;
  const card = preview?.apiBase === apiBase ? preview.card : null;
  const appleDevice = canOpenAppleWallet(navigator.userAgent);
  const googleReady = providers?.googleStatus === "ready";
  const applePass =
    providers?.passUrl && (appleDevice || !googleReady)
      ? providers.passUrl
      : null;
  const canSave = Boolean(applePass) || googleReady;
  const requiresCard =
    status === "requires_card" || providers?.googleStatus === "requires_card";
  const cardNeeded =
    requiresCard || (!canSave && preview?.apiBase === apiBase && !card);
  const canRetry =
    !canSave &&
    !requiresCard &&
    (status === "error" ||
      status === "unavailable" ||
      providers?.googleStatus === "error");

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
      {canSave ? (
        <div className="papu-wallet-save">
          <div className="papu-wallet-save-info">
            <WalletPocket handoff={handoff} />
            <p className="sweeto-wallet-note">
              {applePass && !appleDevice ? t.appleOtherDevice : t.ready}
            </p>
          </div>
          <div className="papu-wallet-actions">
            {applePass && (
              <AppleWalletLink
                language={language}
                passUrl={applePass}
                supported={appleDevice}
                onHandoff={showHandoff}
              />
            )}
            {googleReady && (
              <GoogleWalletButton
                key={`${apiBase}:${card?.checkout ?? ""}`}
                apiBase={apiBase}
                language={language}
                onHandoff={showHandoff}
              />
            )}
          </div>
          {applePass && appleDevice && (
            <small className="sweeto-wallet-refresh-note">
              {providers?.updatesEnabled ? t.automatic : t.refresh}
            </small>
          )}
          {applePass && appleDevice && providers?.recoveryEnabled && (
            <small className="sweeto-wallet-refresh-note">{t.recovery}</small>
          )}
        </div>
      ) : (
        !canRetry &&
        status !== "loading" && (
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
            canSave || canRetry
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
