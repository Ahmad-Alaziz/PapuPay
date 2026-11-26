import { useVenue } from "./VenueContext";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  QrCode,
  Wifi as WifiIcon,
} from "papu-guest-icons";
import { lazy, Suspense, useEffect, useId, useRef, useState } from "react";
import { guestRequest } from "./api";
import type { Language } from "./catalog";
import { wifiQrPayload, type WifiSettings } from "./wifiPayload";

import "./wifi.css";

const QRCode = lazy(() => import("./QRCode"));

const copy = {
  pl: {
    title: "Wi-Fi dla gości",
    network: "Nazwa sieci",
    password: "Hasło",
    show: "Pokaż hasło",
    hide: "Ukryj hasło",
    copy: "Skopiuj hasło",
    copied: "Skopiowano hasło",
    manual: "Zaznacz hasło i skopiuj je ręcznie.",
    settings: "Otwórz Ustawienia → Wi-Fi, wybierz tę sieć i wklej hasło.",
    settingsOpen: "Otwórz Ustawienia → Wi-Fi i wybierz tę sieć.",
    settingsHidden:
      "Otwórz Ustawienia → Wi-Fi, wybierz opcję dodania sieci i wpisz jej nazwę oraz dane.",
    open: "Sieć bez hasła",
    showQr: "Pokaż kod QR",
    hideQr: "Ukryj kod QR",
    qrLabel: "Kod QR sieci Wi-Fi dla gości",
    scan: "Zeskanuj kod aparatem drugiego urządzenia, aby połączyć je z siecią.",
    loading: "Wczytujemy dane sieci…",
    loadingQr: "Wczytujemy kod QR…",
    unavailable: "Poproś obsługę o nazwę sieci dla gości i hasło.",
    failed: "Nie udało się wczytać danych sieci.",
    retry: "Spróbuj ponownie",
  },
  en: {
    title: "Guest Wi-Fi",
    network: "Network name",
    password: "Password",
    show: "Show password",
    hide: "Hide password",
    copy: "Copy password",
    copied: "Password copied",
    manual: "Select the password and copy it manually.",
    settings:
      "Open Settings → Wi-Fi, select this network and paste the password.",
    settingsOpen: "Open Settings → Wi-Fi and select this network.",
    settingsHidden:
      "Open Settings → Wi-Fi, choose to add a network and enter its name and details.",
    open: "No password required",
    showQr: "Show QR code",
    hideQr: "Hide QR code",
    qrLabel: "Guest Wi-Fi network QR code",
    scan: "Scan this code with the camera on another device to connect that device.",
    loading: "Loading network details…",
    loadingQr: "Loading QR code…",
    unavailable: "Ask the team for the guest network name and password.",
    failed: "Couldn’t load network details.",
    retry: "Try again",
  },
  ru: {
    title: "Гостевой Wi-Fi",
    network: "Название сети",
    password: "Пароль",
    show: "Показать пароль",
    hide: "Скрыть пароль",
    copy: "Скопировать пароль",
    copied: "Пароль скопирован",
    manual: "Выделите пароль и скопируйте его вручную.",
    settings:
      "Откройте Настройки → Wi-Fi, выберите эту сеть и вставьте пароль.",
    settingsOpen: "Откройте Настройки → Wi-Fi и выберите эту сеть.",
    settingsHidden:
      "Откройте Настройки → Wi-Fi, выберите добавление сети и введите её название и данные.",
    open: "Пароль не нужен",
    showQr: "Показать QR-код",
    hideQr: "Скрыть QR-код",
    qrLabel: "QR-код гостевой сети Wi-Fi",
    scan: "Отсканируйте код камерой другого устройства, чтобы подключить его к сети.",
    loading: "Загружаем данные сети…",
    loadingQr: "Загружаем QR-код…",
    unavailable: "Уточните у сотрудников название гостевой сети и пароль.",
    failed: "Не удалось загрузить данные сети.",
    retry: "Попробовать снова",
  },
} satisfies Record<Language, object>;

export default function Wifi({ language }: { language: Language }) {
  const { apiBase, venue } = useVenue();
  const t = copy[language];
  const headingId = useId();
  const passwordId = useId();
  const qrId = useId();
  const passwordField = useRef<HTMLInputElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<WifiSettings | null>();
  const [error, setError] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"copied" | "manual">();

  useEffect(() => {
    const controller = new AbortController();
    void guestRequest<{ wifi: WifiSettings | null }>(`${apiBase}/venue/wifi`, {
      signal: controller.signal,
    })
      .then(({ wifi }) => {
        if (!controller.signal.aborted) setResult(wifi);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [attempt, apiBase]);

  useEffect(() => {
    if (copyStatus !== "manual") return;
    passwordField.current?.focus();
    passwordField.current?.select();
  }, [copyStatus]);

  async function copyPassword(password: string) {
    setCopyStatus(undefined);
    try {
      await navigator.clipboard.writeText(password);
      setCopyStatus("copied");
    } catch {
      setRevealed(true);
      setCopyStatus("manual");
    }
  }

  const secured = result && result.security !== "nopass";
  return (
    <section className="papu-wifi" aria-labelledby={headingId}>
      <header className="papu-wifi-heading">
        <span className="papu-wifi-mark" aria-hidden="true">
          <WifiIcon size={28} strokeWidth={1.75} />
        </span>
        <div>
          <p>{venue.name}</p>
          <h2 id={headingId}>{t.title}</h2>
        </div>
      </header>
      {error ? (
        <div className="papu-wifi-empty">
          <p role="alert">{t.failed}</p>
          <button
            className="sweeto-button"
            type="button"
            onClick={() => {
              setError(false);
              setAttempt((previous) => previous + 1);
            }}
          >
            {t.retry}
          </button>
        </div>
      ) : result === undefined ? (
        <p className="papu-wifi-empty" role="status">
          {t.loading}
        </p>
      ) : result === null ? (
        <p className="papu-wifi-empty">{t.unavailable}</p>
      ) : (
        <>
          <dl className="papu-wifi-ticket">
            <div className="papu-wifi-network">
              <dt>{t.network}</dt>
              <dd>
                <bdi>{result.ssid}</bdi>
              </dd>
            </div>
            <div className="papu-wifi-password">
              {secured ? (
                <>
                  <dt>
                    <label htmlFor={passwordId}>{t.password}</label>
                  </dt>
                  <dd className="papu-wifi-password-row">
                    <input
                      ref={passwordField}
                      type={revealed ? "text" : "password"}
                      id={passwordId}
                      dir="auto"
                      value={result.password}
                      readOnly
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      aria-label={revealed ? t.hide : t.show}
                      aria-controls={passwordId}
                      onClick={() => {
                        setRevealed((open) => !open);
                        setCopyStatus(undefined);
                      }}
                    >
                      {revealed ? (
                        <EyeOff aria-hidden="true" size={19} />
                      ) : (
                        <Eye aria-hidden="true" size={19} />
                      )}
                    </button>
                  </dd>
                </>
              ) : (
                <>
                  <dt>{t.password}</dt>
                  <dd>{t.open}</dd>
                </>
              )}
            </div>
          </dl>
          <div className="papu-wifi-actions">
            {secured && (
              <button
                className="sweeto-button"
                type="button"
                onClick={() => void copyPassword(result.password)}
              >
                {copyStatus === "copied" ? (
                  <Check size={18} aria-hidden="true" />
                ) : (
                  <Copy size={18} aria-hidden="true" />
                )}
                {copyStatus === "copied" ? t.copied : t.copy}
              </button>
            )}
            <button
              className="papu-wifi-secondary"
              type="button"
              aria-expanded={showQr}
              aria-controls={qrId}
              onClick={() => setShowQr((show) => !show)}
            >
              <QrCode size={18} aria-hidden="true" />
              {showQr ? t.hideQr : t.showQr}
            </button>
          </div>
          <span
            className={
              copyStatus === "manual"
                ? "papu-wifi-copy-status"
                : "sweeto-sr-only"
            }
            role="status"
          >
            {copyStatus === "copied"
              ? t.copied
              : copyStatus === "manual"
                ? t.manual
                : ""}
          </span>
          <div id={qrId} hidden={!showQr}>
            {showQr && (
              <figure className="papu-wifi-qr">
                <div className="papu-wifi-qr-frame">
                  <Suspense fallback={<p role="status">{t.loadingQr}</p>}>
                    <QRCode
                      value={wifiQrPayload(result)}
                      label={t.qrLabel}
                      reveal
                    />
                  </Suspense>
                </div>
                <figcaption>{t.scan}</figcaption>
              </figure>
            )}
          </div>
          <p className="papu-wifi-instructions">
            {result.hidden
              ? t.settingsHidden
              : secured
                ? t.settings
                : t.settingsOpen}
          </p>
        </>
      )}
    </section>
  );
}
