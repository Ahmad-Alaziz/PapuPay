import { guestPath, venueId } from "./guest/route";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  CircleAlert,
  Coffee,
  Gift,
  LockKeyhole,
  LogOut,
  Plus,
  Printer,
  QrCode,
  ScanLine,
  ScrollText,
  X,
} from "papu-guest-icons";
import QRCode from "./guest/QRCode";
import { sweeto } from "./guest/VenueContext";
import { staffCopy, type Copy, type StaffLanguage } from "./staff/copy";
import "./staff.css";

type StaffBrand = { id: string; name: string; logoUrl?: string | null };
type StaffSession = { authenticated: boolean; manager: boolean; demo: boolean };
type CardRecord = {
  code: string;
  stamps: number;
  goal: number;
  rewardAvailable: boolean;
};
type CardEvent = {
  id: string;
  kind: "stamp" | "redeem" | "reverse";
  receipt: string | null;
  createdAt: string;
  reversed: boolean;
};
type Lookup = { card: CardRecord; events: CardEvent[] };
type Tool = "scanner" | "signs";
type Action = "stamp" | "redeem" | "reverse";

type QrDetector = {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
};

const Detector = (
  globalThis as typeof globalThis & {
    BarcodeDetector?: new (options: { formats: string[] }) => QrDetector;
  }
).BarcodeDetector;

async function canvasQrReader() {
  const { default: readQr } = await import("jsqr");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Camera frame unavailable");

  return (video: HTMLVideoElement) => {
    const scale = Math.min(
      1,
      640 / Math.max(video.videoWidth, video.videoHeight),
    );
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    context.drawImage(video, 0, 0, width, height);
    const frame = context.getImageData(0, 0, width, height);
    const result = readQr(frame.data, width, height, {
      inversionAttempts: "dontInvert",
    });
    return result ? [result.data] : [];
  };
}

function qrReader() {
  let detector: QrDetector | undefined;
  let readCanvas: Awaited<ReturnType<typeof canvasQrReader>> | undefined;
  try {
    if (Detector) detector = new Detector({ formats: ["qr_code"] });
  } catch {
    // Some browsers expose BarcodeDetector before implementing QR detection.
  }

  return async (video: HTMLVideoElement) => {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return [];
    if (detector) {
      try {
        return (await detector.detect(video)).map(({ rawValue }) => rawValue);
      } catch {
        detector = undefined;
      }
    }
    readCanvas ??= await canvasQrReader();
    return readCanvas(video);
  };
}

async function request<T>(
  path: string,
  method = "GET",
  body?: object,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v/${venueId(location.pathname)}${path}`, {
      method,
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("offline");
  }

  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload === null) {
    throw new Error(payload?.error || "unknown");
  }
  return payload as T;
}

function errorCode(error: unknown) {
  return error instanceof Error ? error.message : "unknown";
}

function Alert({ copy, error }: { copy: Copy; error: string }) {
  if (!error) return null;
  const message =
    copy.errors[error as keyof Copy["errors"]] || copy.errors.unknown;
  return (
    <p className="staff-alert" role="alert">
      <CircleAlert size={17} />
      {message}
    </p>
  );
}

const copyLabels = { pl: "Język", en: "Language", ru: "Язык" };

function LanguagePicker({
  language,
  setLanguage,
}: {
  language: StaffLanguage;
  setLanguage: (language: StaffLanguage) => void;
}) {
  return (
    <div
      className="staff-languages"
      role="group"
      aria-label={copyLabels[language]}
    >
      <button
        type="button"
        lang="pl"
        aria-label="Polski"
        aria-pressed={language === "pl"}
        onClick={() => setLanguage("pl")}
      >
        PL
      </button>
      <button
        type="button"
        lang="en"
        aria-label="English"
        aria-pressed={language === "en"}
        onClick={() => setLanguage("en")}
      >
        EN
      </button>
      <button
        type="button"
        lang="ru"
        aria-label="Русский"
        aria-pressed={language === "ru"}
        onClick={() => setLanguage("ru")}
      >
        RU
      </button>
    </div>
  );
}

function Brand({ copy, logoUrl }: { copy: Copy; logoUrl?: StaffBrand["logoUrl"] }) {
  return (
    <div className="staff-brand">
      {logoUrl ? <img src={logoUrl} alt={copy.venue} width={98} height={36} /> : <strong>{copy.venue}</strong>}
      <small>{copy.area}</small>
    </div>
  );
}

function SignIn({
  copy,
  demo,
  loading,
  pending,
  error,
  onSignIn,
}: {
  copy: Copy;
  demo: boolean;
  loading: boolean;
  pending: boolean;
  error: string;
  onSignIn: (pin: string) => Promise<boolean>;
}) {
  const [pin, setPin] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await onSignIn(pin)) setPin("");
  }

  return (
    <main className="staff-signin">
      <section className="staff-signin-intro">
        <div className="staff-signin-ticket" aria-hidden="true">
          <Coffee size={24} strokeWidth={1.25} />
          <span />
          {[0, 1, 2, 3, 4, 5].map((stamp) => (
            <i
              key={stamp}
              className={stamp < 3 ? "staff-ticket-stamped" : undefined}
            >
              {stamp < 3 && <Check size={17} />}
            </i>
          ))}
        </div>
        <div>
          <h1>{copy.welcome}</h1>
          <p>{copy.welcomeBody}</p>
        </div>
      </section>
      <section
        className="staff-signin-panel"
        aria-labelledby="staff-login-title"
      >
        <LockKeyhole
          size={24}
          strokeWidth={1.6}
          className="staff-signin-icon"
        />
        <h2 id="staff-login-title">{copy.login}</h2>
        <p>{copy.loginBody}</p>
        <form onSubmit={submit}>
          <label htmlFor="staff-pin">{copy.pin}</label>
          <input
            id="staff-pin"
            type="password"
            inputMode={demo ? "numeric" : undefined}
            autoComplete="current-password"
            minLength={4}
            maxLength={128}
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            required
          />
          <Alert copy={copy} error={error} />
          <button
            type="submit"
            className="staff-button staff-primary"
            disabled={loading || pending || pin.length < 4}
          >
            {loading || pending ? copy.loading : copy.loginAction}
            <ArrowRight size={18} />
          </button>
        </form>
        {demo && (
          <p className="staff-demo">
            <strong>{copy.demo}</strong>
            <span>{copy.demoPins}</span>
          </p>
        )}
      </section>
    </main>
  );
}

function CameraPreview({
  copy,
  onCode,
  onFailure,
  onClose,
}: {
  copy: Copy;
  onCode: (code: string) => void;
  onFailure: () => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let stream: MediaStream | undefined;
    let frame: ReturnType<typeof setTimeout> | undefined;
    const video = videoRef.current;
    if (!video) return;

    function stop() {
      disposed = true;
      if (frame !== undefined) clearTimeout(frame);
      stream?.getTracks().forEach((track) => track.stop());
    }

    async function open(video: HTMLVideoElement) {
      const readQr = qrReader();
      const camera = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      if (disposed) {
        camera.getTracks().forEach((track) => track.stop());
        return;
      }

      stream = camera;
      video.srcObject = stream;
      await video.play();
      if (disposed) return;
      setReady(true);

      async function detect() {
        if (disposed) return;
        const codes = await readQr(video);
        if (disposed) return;
        const result = codes.find((value) => /^pp_[A-Za-z0-9_-]+$/.test(value));
        if (result) {
          stop();
          onCode(result);
        } else {
          frame = setTimeout(() => {
            void detect().catch(fail);
          }, 120);
        }
      }

      await detect();
    }

    function fail() {
      if (disposed) return;
      stop();
      onFailure();
    }

    void open(video).catch(fail);
    return stop;
  }, [onCode, onFailure]);

  return (
    <div className="staff-camera-live">
      <video ref={videoRef} muted playsInline aria-hidden="true" />
      <span className="staff-camera-frame" aria-hidden="true" />
      <p role="status">{ready ? copy.cameraGuide : copy.cameraStarting}</p>
      <button
        className="staff-camera-close"
        type="button"
        aria-label={copy.cameraStop}
        onClick={onClose}
      >
        <X size={22} />
      </button>
    </div>
  );
}

function Scanner({
  copy,
  language,
  manager,
  active,
  onError,
}: {
  copy: Copy;
  language: StaffLanguage;
  manager: boolean;
  active: boolean;
  onError: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const [receipt, setReceipt] = useState("");
  const [record, setRecord] = useState<Lookup | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<Action | null>(null);
  const [pending, setPending] = useState<Action | "lookup" | null>(null);
  const [camera, setCamera] = useState(false);
  const [cameraNotice, setCameraNotice] = useState(false);
  const [confirmRedeem, setConfirmRedeem] = useState(false);
  const [correction, setCorrection] = useState<CardEvent | null>(null);
  const [reason, setReason] = useState("");
  const retryIds = useRef(new Map<string, string>());
  const codeInput = useRef<HTMLInputElement>(null);
  const recordTitle = useRef<HTMLHeadingElement>(null);
  const didLookup = useRef(false);
  const lookingUp = useRef(false);
  const canScan = Boolean(
    window.isSecureContext && navigator.mediaDevices?.getUserMedia,
  );

  useEffect(() => {
    if (active && record && didLookup.current) {
      didLookup.current = false;
      recordTitle.current?.focus();
    }
    if (!active) setCamera(false);
  }, [active, record]);

  const lookup = useCallback(
    async (value: string) => {
      if (lookingUp.current) return;
      lookingUp.current = true;
      setPending("lookup");
      setError("");
      setCamera(false);
      setCameraNotice(false);
      try {
        const result = await request<Lookup>("/staff/lookup", "POST", {
          code: value,
        });
        didLookup.current = true;
        setRecord(result);
      } catch (problem) {
        const failure = errorCode(problem);
        setError(failure);
        onError(failure);
        codeInput.current?.focus();
      } finally {
        lookingUp.current = false;
        setPending(null);
      }
    },
    [onError],
  );

  const cameraFailure = useCallback(() => {
    setCamera(false);
    setCameraNotice(true);
    codeInput.current?.focus();
  }, []);

  function nextCard() {
    setRecord(null);
    setCode("");
    setReceipt("");
    setFeedback(null);
    setError("");
    setConfirmRedeem(false);
    setCorrection(null);
    setReason("");
    requestAnimationFrame(() => codeInput.current?.focus());
  }

  async function transact(action: Action) {
    if (!record || pending) return;
    const cardCode = record.card.code;
    const details =
      action === "stamp"
        ? { receipt: receipt.trim() }
        : action === "reverse"
          ? { eventId: correction?.id, reason: reason.trim() }
          : {};
    const key = JSON.stringify([cardCode, action, details]);
    const actionId =
      retryIds.current.get(key) ||
      Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
    retryIds.current.set(key, actionId);
    setPending(action);
    setFeedback(null);
    setError("");
    try {
      setRecord(
        await request<Lookup>(`/staff/${action}`, "POST", {
          code: cardCode,
          actionId,
          ...details,
        }),
      );
      retryIds.current.delete(key);
      if (action === "stamp") setReceipt("");
      if (action === "redeem") setConfirmRedeem(false);
      if (action === "reverse") {
        setCorrection(null);
        setReason("");
      }
      setFeedback(action);
    } catch (problem) {
      const failure = errorCode(problem);
      setError(failure);
      onError(failure);
    } finally {
      setPending(null);
    }
  }

  if (!active) return null;

  if (!record) {
    const normalized = code.replace(/[\s-]/g, "").toUpperCase();
    const validCode = /^[A-Z0-9]{8}$/.test(normalized);
    return (
      <section className="staff-tool" aria-labelledby="staff-scanner-title">
        <div className="staff-tool-heading">
          <h1 id="staff-scanner-title">{copy.loyalty}</h1>
          <p>{copy.loyaltyBody}</p>
        </div>
        <div className="staff-surface staff-lookup">
          {camera ? (
            <CameraPreview
              copy={copy}
              onCode={lookup}
              onFailure={cameraFailure}
              onClose={() => setCamera(false)}
            />
          ) : (
            <div className="staff-camera-placeholder" data-available={canScan}>
              <span className="staff-camera-symbol" aria-hidden="true">
                <ScanLine size={32} strokeWidth={1.2} />
              </span>
              {canScan ? (
                <button
                  className="staff-button staff-camera-open"
                  type="button"
                  disabled={Boolean(pending)}
                  onClick={() => {
                    setError("");
                    setCamera(true);
                  }}
                >
                  <Camera size={18} />
                  {copy.scan}
                </button>
              ) : (
                <p>{copy.cameraUnsupported}</p>
              )}
              {cameraNotice && <p role="status">{copy.cameraError}</p>}
            </div>
          )}
          <form
            className="staff-code-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (validCode) void lookup(normalized);
            }}
          >
            <label htmlFor="staff-card-code">{copy.cardCode}</label>
            <input
              ref={codeInput}
              id="staff-card-code"
              value={code}
              placeholder={copy.codePlaceholder}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              maxLength={9}
              pattern="[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              required
            />
            <Alert copy={copy} error={error} />
            <button
              className="staff-button staff-primary"
              type="submit"
              disabled={!validCode || Boolean(pending)}
            >
              {pending === "lookup" ? copy.loading : copy.find}
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </section>
    );
  }

  const { card, events } = record;
  const feedbackText = {
    stamp: copy.successStamp,
    redeem: copy.successRedeem,
    reverse: copy.successReverse,
  };
  const date = new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <section className="staff-tool" aria-labelledby="staff-card-title">
      <button
        className="staff-back"
        type="button"
        onClick={nextCard}
        disabled={Boolean(pending)}
      >
        <ArrowLeft size={17} />
        {copy.changeCard}
      </button>
      <div className="staff-tool-heading staff-card-heading">
        <h1 id="staff-card-title" ref={recordTitle} tabIndex={-1}>
          {copy.activeCard}
        </h1>
        <span className="staff-short-code">{card.code}</span>
      </div>
      <div className="staff-balance">
        <div>
          <strong>
            {card.stamps}
            <span>/{card.goal}</span>
          </strong>
          <small>{copy.stamps}</small>
        </div>
        <div className="staff-slots" aria-hidden="true">
          {Array.from({ length: card.goal }, (_, slot) => (
            <span key={slot} data-stamped={slot < card.stamps}>
              {slot < card.stamps ? <Check size={17} /> : null}
            </span>
          ))}
        </div>
        {card.rewardAvailable && (
          <p>
            <Gift size={18} />
            {copy.ready}
          </p>
        )}
      </div>
      {feedback && (
        <div className="staff-success" role="status" key={feedback}>
          <Check size={19} />
          {feedbackText[feedback]}
        </div>
      )}
      <Alert copy={copy} error={error} />
      <div className="staff-card-actions">
        {card.rewardAvailable && (
          <div className="staff-surface staff-action">
            <h2>{copy.redeem}</h2>
            <p>{copy.redeemHint}</p>
            {confirmRedeem ? (
              <div className="staff-confirm-actions">
                <button
                  className="staff-button staff-primary"
                  type="button"
                  disabled={Boolean(pending)}
                  onClick={() => {
                    void transact("redeem");
                  }}
                >
                  {pending === "redeem" ? copy.loading : copy.redeemConfirm}
                </button>
                <button
                  className="staff-button staff-secondary"
                  type="button"
                  disabled={Boolean(pending)}
                  onClick={() => setConfirmRedeem(false)}
                >
                  {copy.cancel}
                </button>
              </div>
            ) : (
              <button
                className="staff-button staff-secondary"
                type="button"
                disabled={Boolean(pending)}
                onClick={() => setConfirmRedeem(true)}
              >
                <Gift size={18} />
                {copy.redeem}
              </button>
            )}
          </div>
        )}
        <form
          className="staff-surface staff-action"
          onSubmit={(event) => {
            event.preventDefault();
            void transact("stamp");
          }}
        >
          <label htmlFor="staff-receipt">{copy.receipt}</label>
          <p id="staff-receipt-hint">{copy.receiptHint}</p>
          <input
            id="staff-receipt"
            value={receipt}
            onChange={(event) => setReceipt(event.target.value)}
            autoComplete="off"
            minLength={2}
            maxLength={80}
            required
            aria-describedby="staff-receipt-hint"
          />
          <button
            className="staff-button staff-primary"
            type="submit"
            disabled={Boolean(pending) || receipt.trim().length < 2}
          >
            <Plus size={18} />
            {pending === "stamp" ? copy.loading : copy.stamp}
          </button>
        </form>
      </div>
      <details className="staff-surface staff-events">
        <summary>
          {copy.activity}
          <span>{events.length}</span>
        </summary>
        {events.length === 0 && <p>{copy.emptyActivity}</p>}
        <ul>
          {events.map((entry) => (
            <li key={entry.id}>
              <div>
                <strong>{copy.transaction[entry.kind]}</strong>
                <p>
                  {date.format(new Date(entry.createdAt))}
                  {entry.receipt && ` · ${copy.receiptLabel} ${entry.receipt}`}
                </p>
              </div>
              {entry.reversed ? (
                <span>{copy.reversed}</span>
              ) : (
                manager &&
                entry.kind !== "reverse" && (
                  <button
                    type="button"
                    className="staff-text-button"
                    disabled={Boolean(pending)}
                    onClick={() => {
                      setCorrection(entry);
                      setReason("");
                    }}
                  >
                    {copy.correct}
                  </button>
                )
              )}
              {correction?.id === entry.id && (
                <form
                  className="staff-correction"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void transact("reverse");
                  }}
                >
                  <label htmlFor="staff-reason">{copy.reason}</label>
                  <input
                    id="staff-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={copy.reasonHint}
                    minLength={3}
                    maxLength={160}
                    required
                  />
                  <div className="staff-confirm-actions">
                    <button
                      type="submit"
                      className="staff-button staff-primary"
                      disabled={Boolean(pending) || reason.trim().length < 3}
                    >
                      {pending === "reverse" ? copy.loading : copy.correction}
                    </button>
                    <button
                      type="button"
                      className="staff-button staff-secondary"
                      disabled={Boolean(pending)}
                      onClick={() => setCorrection(null)}
                    >
                      {copy.cancel}
                    </button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function Signs({ copy, venue }: { copy: Copy; venue: StaffBrand }) {
  const signs = [
    { kind: "table", name: copy.table, action: copy.tableAction },
    { kind: "counter", name: copy.counter, action: copy.counterAction },
    { kind: "menu", name: copy.directMenu, action: copy.directMenuAction },
  ];
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  return (
    <section
      className="staff-tool staff-sign-tool"
      aria-labelledby="staff-signs-title"
    >
      <div className="staff-tool-heading staff-sign-heading">
        <div>
          <h1 id="staff-signs-title">{copy.signage}</h1>
          <p>{copy.signBody}</p>
        </div>
        <button
          className="staff-button staff-primary"
          type="button"
          onClick={() => window.print()}
        >
          <Printer size={18} />
          {copy.print}
        </button>
      </div>
      {local && <p className="staff-sign-note">{copy.localSigns}</p>}
      <div className="staff-signs">
        {signs.map((sign) => {
          const url = `${location.origin}/go/${venue.id}/${sign.kind}`;
          return (
            <article className="staff-placard" key={sign.kind}>
              <div className="staff-placard-edge" aria-hidden="true" />
              {venue.logoUrl ? <img className="staff-placard-logo" src={venue.logoUrl} alt={venue.name} width={104} height={34} /> : <strong>{venue.name}</strong>}
              <h2>{sign.action}</h2>
              <div className="staff-placard-qr">
                <QRCode value={url} label={`${sign.name} — ${sign.action}`} />
              </div>
              <p>
                {sign.kind === "counter" ? copy.existingCard : copy.scanSign}
              </p>
              <a href={url} className="staff-placard-url">
                {url.replace(/^https?:\/\//, "")}
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function Staff() {
  const activeVenue = venueId(location.pathname);
  const [language, setLanguage] = useState<StaffLanguage>("pl");
  const [brand, setBrand] = useState<StaffBrand | null>(activeVenue === sweeto.id ? sweeto : null);
  const [brandFailed, setBrandFailed] = useState(false);
  const [session, setSession] = useState<StaffSession | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [tool, setTool] = useState<Tool>("scanner");
  const base = staffCopy[language];
  const copy = {
    ...base,
    venue: brand?.name ?? "PapuPay",
    welcomeBody: brand ? base.welcomeBody.replace(base.venue, () => brand.name) : base.area,
    tableAction: brand ? base.tableAction.replace(base.venue, () => brand.name) : base.guest,
  };

  useEffect(() => {
    let alive = true;
    request<StaffSession>("/staff/session")
      .then((value) => {
        if (alive) setSession(value);
      })
      .catch((problem) => {
        if (!alive) return;
        setSession({ authenticated: false, manager: false, demo: false });
        setError(errorCode(problem));
      });
    void request<StaffBrand>("/venue")
      .then((value) => {
        if (alive && value.id === activeVenue) setBrand(value);
      })
      .catch(() => { if (alive) setBrandFailed(true); });
    return () => {
      alive = false;
    };
  }, [activeVenue]);

  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = language;
    return () => {
      document.documentElement.lang = previous;
    };
  }, [language]);

  const onError = useCallback((code: string) => {
    if (code !== "sign_in_required") return;
    setSession(
      (current) =>
        current && { ...current, authenticated: false, manager: false },
    );
    setError(code);
    setTool("scanner");
  }, []);

  async function signIn(pin: string) {
    setPending(true);
    setError("");
    try {
      setSession(
        await request<StaffSession>("/staff/session", "POST", { pin }),
      );
      return true;
    } catch (problem) {
      setError(errorCode(problem));
      return false;
    } finally {
      setPending(false);
    }
  }

  async function signOut() {
    setPending(true);
    setError("");
    try {
      await request("/staff/session", "DELETE");
      setSession(
        (current) =>
          current && { ...current, authenticated: false, manager: false },
      );
      setTool("scanner");
    } catch (problem) {
      setError(errorCode(problem));
    } finally {
      setPending(false);
    }
  }

  const nav = [
    { id: "scanner" as const, icon: QrCode, label: copy.loyalty },
    { id: "signs" as const, icon: ScrollText, label: copy.signage },
  ];

  return (
    <div className="staff-shell" lang={language}>
      <header className="staff-header">
        <Brand copy={copy} logoUrl={brand?.logoUrl} />
        <div className="staff-header-controls">
          <LanguagePicker language={language} setLanguage={setLanguage} />{" "}
          <a href={guestPath("home", activeVenue)} className="staff-guest-link">
            {copy.guest}
            <ArrowUpRight size={16} />
          </a>
        </div>
      </header>
      {session?.authenticated ? (
        <main className="staff-layout">
          <aside className="staff-sidebar">
            <span className="staff-role">
              {session.manager ? copy.manager : copy.staff}
            </span>
            <nav aria-label={copy.nav}>
              {nav
                .filter(({ id }) => session.manager || id === "scanner")
                .map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    aria-current={tool === id ? "page" : undefined}
                    onClick={() => setTool(id)}
                  >
                    <Icon size={19} strokeWidth={1.7} />
                    {label}
                  </button>
                ))}
            </nav>
            <button
              className="staff-signout"
              type="button"
              aria-label={copy.logout}
              title={copy.logout}
              disabled={pending}
              onClick={() => {
                void signOut();
              }}
            >
              <LogOut size={18} />
              <span>{copy.logout}</span>
            </button>
          </aside>
          <div className="staff-workspace">
            <Alert copy={copy} error={error} />
            <Scanner
              copy={copy}
              language={language}
              manager={session.manager}
              active={tool === "scanner"}
              onError={onError}
            />
            {session.manager && tool === "signs" && (brand
              ? <Signs copy={copy} venue={brand} />
              : <p role="status">{brandFailed ? copy.errors.offline : copy.loading}</p>)}
          </div>
        </main>
      ) : (
        <SignIn
          copy={copy}
          demo={session?.demo ?? false}
          loading={session === null}
          pending={pending}
          error={error}
          onSignIn={signIn}
        />
      )}
    </div>
  );
}
