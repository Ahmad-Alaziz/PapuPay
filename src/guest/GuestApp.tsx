import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
} from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
} from "papu-guest-motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Globe2,
  MapPin,
  ChevronDown,
  BookOpen,
  ClipboardList,
  type LucideIcon,
  Badge,
  Star,
  Wifi as WifiIcon,
  X,
} from "papu-guest-icons";
import type { Language } from "./catalog";
import { copy } from "./copy";
import { guestRequest, type LoyaltyCard, type VenueStatus } from "./api";
import Loyalty from "./Loyalty";
import { VenueContext, sweeto } from "./VenueContext";
import Wallet from "./Wallet";
import LoyaltyTest from "./LoyaltyTest";
import MenuReader from "./MenuReader";
import RestoreCard from "./RestoreCard";
import Wifi from "./Wifi";
import PapuWelcomeMark from "./PapuWelcomeMark";
import { guestPath, guestRoute, venueId, type View } from "./route";
import { attachTicketPull } from "./ticketPull";
import "./guest.css";
import "./destination-nav.css";

const ease = [0.22, 1, 0.36, 1] as const;
function initialLanguage(): Language {
  const requested = new URLSearchParams(location.search).get("lang");
  if (requested === "pl" || requested === "en" || requested === "ru")
    return requested;
  try {
    const saved = localStorage.getItem("sweeto-language");
    if (saved === "pl" || saved === "en" || saved === "ru") return saved;
  } catch {
    /* Optional storage. */
  }
  return "pl";
}
function reviewClick(apiBase: string) {
  void fetch(`${apiBase}/venue/review-click`, {
    method: "POST",
    keepalive: true,
  }).catch(() => {});
}
function VenueLanguage({
  language,
  onChange,
}: {
  language: Language;
  onChange: (next: Language) => void;
}) {
  return (
    <label className="papu-language">
      <Globe2 size={16} aria-hidden="true" />
      <span aria-hidden="true">{language.toUpperCase()}</span>
      <ChevronDown size={13} aria-hidden="true" />
      <select
        aria-label={copy[language].language}
        value={language}
        onChange={(event) => onChange(event.target.value as Language)}
      >
        <option value="pl" lang="pl">
          Polski
        </option>
        <option value="en" lang="en">
          English
        </option>
        <option value="ru" lang="ru">
          Русский
        </option>
      </select>
    </label>
  );
}

function Sheet({
  children,
  onClose,
  label,
  closeLabel,
  view,
  returnsToSheet = false,
  navigation,
  onArrow,
}: {
  children: ReactNode;
  onClose: () => void;
  label: string;
  closeLabel: string;
  view: View;
  returnsToSheet?: boolean;
  navigation?: ReactNode;
  onArrow?: (direction: number) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const dialog = ref.current;
    const old = document.body.style.overflow;
    const trigger = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = old;
      if (trigger && trigger !== document.body && trigger.isConnected) {
        trigger.focus({ preventScroll: true });
      } else if (guestRoute(location.pathname).view === "home") {
        const homeAction = document.querySelector<HTMLElement>(
          `.papu-home-action[data-destination="${view}"]`,
        );
        (
          homeAction ??
          document.querySelector<HTMLElement>(".papu-home-action-primary")
        )?.focus({ preventScroll: true });
      }
    };
  }, [view]);
  return (
    <motion.dialog
      ref={ref}
      className={`sweeto-dialog ${view === "menu" ? "sweeto-dialog-wide" : ""}${navigation ? " guest-destination" : ""}`}
      data-view={view}
      aria-label={label}
      onKeyDown={(event) => {
        if (
          onArrow &&
          (event.key === "ArrowLeft" || event.key === "ArrowRight")
        ) {
          event.preventDefault();
          onArrow(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      initial={{ opacity: 0, y: reduced ? 0 : 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduced ? 0 : 16 }}
      transition={{ duration: 0.3, ease }}
    >
      {navigation ?? (
        <button
          className="sweeto-close"
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
        >
          {returnsToSheet ? <ArrowLeft size={20} /> : <X size={20} />}
        </button>
      )}
      {children}
    </motion.dialog>
  );
}
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-1.99 3.01v2.5h3.23c1.88-1.73 2.98-4.28 2.98-7.35Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.62-2.42l-3.23-2.5c-.9.61-2.04.97-3.39.97-2.61 0-4.83-1.76-5.62-4.12H3.04v2.58A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.38 13.93a6.06 6.06 0 0 1 0-3.86V7.49H3.04a10 10 0 0 0 0 9.02l3.34-2.58Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.95c1.47 0 2.79.51 3.82 1.51l2.86-2.87A9.58 9.58 0 0 0 12 2a10 10 0 0 0-8.96 5.49l3.34 2.58C7.17 7.71 9.39 5.95 12 5.95Z"
      />
    </svg>
  );
}
function VenueMark({ id, name }: { id: string; name: string }) {
  return id === "sweeto" ? (
    <img
      className="sweeto-venue-mark"
      src="/assets/sweeto/logo-white.png"
      alt={name}
      width="398"
      height="63"
    />
  ) : (
    <span className="sweeto-venue-wordmark">{name}</span>
  );
}

function FooterBrand({ welcome }: { welcome: boolean }) {
  return (
    <span className="papu-footer-brand">
      <PapuWelcomeMark eligible={welcome} />
      <img
        src="/assets/papupay-wordmark.svg"
        alt="Papupay"
        width="115"
        height="29"
      />
    </span>
  );
}

function HomeAction({
  icon: Icon,
  label,
  detail,
  destination,
  href,
  onClick,
  external = false,
  pullable = false,
  primary = false,
}: {
  icon: LucideIcon;
  label: string;
  detail?: string;
  destination: Exclude<View, "home" | "missing">;
  href: string;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  external?: boolean;
  pullable?: boolean;
  primary?: boolean;
}) {
  const Direction = external ? ArrowUpRight : ArrowRight;
  return (
    <a
      ref={pullable ? attachTicketPull : undefined}
      className={`papu-home-action${primary ? " papu-home-action-primary" : ""}`}
      data-destination={destination}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={onClick}
    >
      <span className="papu-action-icon" aria-hidden="true">
        <Icon className="papu-action-symbol" size={21} strokeWidth={1.8} />
      </span>
      <span className="papu-action-copy">
        <span className="papu-action-label">{label}</span>
        {detail && <span className="papu-action-detail">{detail}</span>}
      </span>
      <span
        className={
          pullable ? "papu-action-tail papu-ticket-stub" : "papu-action-tail"
        }
        aria-hidden="true"
      >
        <span className="papu-action-arrow">
          <Direction size={16} strokeWidth={1.8} />
        </span>
      </span>
    </a>
  );
}

export default function GuestApp() {
  const [language, setLanguage] = useState(initialLanguage);
  const [restoreToken, setRestoreToken] = useState(
    () => new URLSearchParams(location.hash.slice(1)).get("token") || "",
  );
  useLayoutEffect(() => {
    function captureRestoreLink() {
      if (guestRoute(location.pathname).view !== "restore" || !location.hash)
        return;
      setRestoreToken(
        new URLSearchParams(location.hash.slice(1)).get("token") || "",
      );
      history.replaceState(
        history.state,
        "",
        location.pathname + location.search,
      );
      setView("restore");
    }
    captureRestoreLink();
    window.addEventListener("hashchange", captureRestoreLink);
    return () => window.removeEventListener("hashchange", captureRestoreLink);
  }, []);
  const id = venueId(location.pathname);
  const apiBase = `/api/v/${id}`;
  const [venue, setVenue] = useState<VenueStatus>(sweeto);
  const [venueLoaded, setVenueLoaded] = useState(false);
  const [venueError, setVenueError] = useState(false);
  const [view, setView] = useState<View>(
    () => guestRoute(location.pathname).view,
  );
  const [balance, setBalance] = useState<Pick<
    LoyaltyCard,
    "stamps" | "goal" | "rewardAvailable"
  > | null>(null);
  const t = copy[language];
  const titles: Record<View, string> = {
    home: venue.name,
    menu: t.menuTitle,
    card: t.card,
    wifi: t.homeWifi,
    reviews: t.review,
    missing: t.missing,
    restore: t.card,
    wallet: language === "pl" ? "Portfel Apple" : "Apple Wallet",
    test:
      language === "pl"
        ? "Test karty"
        : language === "ru"
          ? "Проверка карты"
          : "Test loyalty card",
  };
  const screenTitle = titles[view];
  const reviewUrl = venue.reviewUrl;
  const isSweeto = id === "sweeto";
  const photo = isSweeto ? "/assets/sweeto/matylda-table.webp" : venue.photoUrl;
  const parentView: View | undefined = history.state?.sweetoParentView;
  const path = (next: Exclude<View, "missing">) => {
    const base = guestPath(next, id);
    if (!new URLSearchParams(location.search).has("lang")) return base;
    return `${base}?lang=${language}`;
  };
  useEffect(() => {
    const controller = new AbortController();
    void guestRequest<VenueStatus>(`${apiBase}/venue`, {
      signal: controller.signal,
    })
      .then((value) => {
        setVenue(value);
        setVenueLoaded(true);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        if (id === "sweeto") setVenueLoaded(true);
        else setVenueError(true);
      });
    const pop = () => {
      setLanguage(initialLanguage());
      setView(guestRoute(location.pathname).view);
    };
    window.addEventListener("popstate", pop);
    return () => {
      controller.abort();
      window.removeEventListener("popstate", pop);
    };
  }, [apiBase]);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title =
      view === "home" ? venue.name : `${screenTitle} · ${venue.name}`;
    try {
      localStorage.setItem("sweeto-language", language);
    } catch {
      /* Optional storage. */
    }
  }, [language, screenTitle, venue.name, view]);
  useEffect(() => {
    if (view !== "home") return;
    const controller = new AbortController();
    void guestRequest<{ card: LoyaltyCard | null }>(`${apiBase}/loyalty/card`, {
      signal: controller.signal,
    })
      .then(({ card }) => {
        if (controller.signal.aborted) return;
        setBalance(
          card
            ? {
                stamps: card.stamps,
                goal: card.goal,
                rewardAvailable: card.rewardAvailable,
              }
            : null,
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setBalance(null);
      });
    return () => controller.abort();
  }, [apiBase, view]);
  const closing = useRef(false);
  useEffect(() => {
    closing.current = false;
  }, [view]);
  function closeSheet() {
    if (closing.current) return;
    closing.current = true;
    if (history.state?.sweetoSheet) history.back();
    else {
      history.replaceState({}, "", path("home"));
      setView("home");
    }
  }
  function navigate(next: Exclude<View, "missing">) {
    if (next === "home" && view !== "home") {
      closeSheet();
      return;
    }
    if (next === view) return;
    if (history.state?.sweetoSheet && next === parentView) {
      closeSheet();
      return;
    }
    history.pushState(
      { sweetoSheet: true, sweetoParentView: view },
      "",
      path(next),
    );
    setView(next);
  }
  function changeLanguage(next: Language) {
    setLanguage(next);
    const url = new URL(location.href);
    if (url.searchParams.has("lang")) {
      url.searchParams.set("lang", next);
      history.replaceState(history.state, "", url);
    }
  }
  function route(
    event: MouseEvent<HTMLAnchorElement>,
    next: Exclude<View, "missing">,
  ) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    navigate(next);
  }
  if ((!venueLoaded && id !== "sweeto") || venueError)
    return (
      <main className="sweeto-venue-status">
        <h1>
          {venueError
            ? t.missing
            : language === "pl"
              ? "Otwieramy lokal…"
              : language === "ru"
                ? "Открываем заведение…"
                : "Opening venue…"}
        </h1>
        <p>{venueError ? t.missingText : ""}</p>
        {venueError && (
          <button className="sweeto-button" onClick={() => location.reload()}>
            {t.retry}
          </button>
        )}
      </main>
    );
  return (
    <VenueContext.Provider value={{ venue, apiBase, navigate }}>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.3, ease }}>
        <div className="sweeto-guest" data-venue={id}>
          <header className="papu-header">
            <a
              className="sweeto-venue-brand-link"
              href={path("home")}
              onClick={(event) => route(event, "home")}
            >
              <VenueMark id={id} name={venue.name} />
            </a>
            <VenueLanguage language={language} onChange={changeLanguage} />
          </header>
          <main className="papu-home">
            <section className="papu-cover" aria-labelledby="guest-welcome">
              {photo && (
                <img
                  className="papu-cover-photo"
                  src={photo}
                  alt=""
                  width={isSweeto ? 1170 : 1296}
                  height={isSweeto ? 1170 : 864}
                  fetchPriority="high"
                  draggable={false}
                  onError={
                    isSweeto
                      ? (event) => {
                          const image = event.currentTarget;
                          if (image.dataset.fallback) return;
                          image.dataset.fallback = "true";
                          image.src = "/assets/sweeto/matylda.webp";
                        }
                      : undefined
                  }
                />
              )}
              <div className="papu-cover-copy papu-home-width">
                {isSweeto && <p className="papu-cover-dish">{t.gallery[0]}</p>}
                <h1 id="guest-welcome">
                  {isSweeto ? t.dessertMenu : venue.name}
                </h1>
                {isSweeto ? (
                  <p className="papu-cover-order">{t.help}</p>
                ) : (
                  <HomeAction
                    icon={BookOpen}
                    label={t.menu}
                    destination="menu"
                    href={path("menu")}
                    onClick={(event) => route(event, "menu")}
                    primary
                  />
                )}
              </div>
            </section>
            <nav
              className="papu-home-actions papu-home-width"
              aria-label={t.guestServices}
            >
              <div className="papu-home-action-group">
                {isSweeto && (
                  <HomeAction
                    icon={BookOpen}
                    label={t.menu}
                    destination="menu"
                    href={path("menu")}
                    onClick={(event) => route(event, "menu")}
                    primary
                  />
                )}
                <HomeAction
                  icon={isSweeto ? ClipboardList : Badge}
                  label={isSweeto && !balance ? t.openCard : t.homeCard}
                  destination="card"
                  detail={
                    balance
                      ? balance.rewardAvailable
                        ? t.homeReward
                        : `${balance.stamps} ${t.from} ${balance.goal} ${t.progress}`
                      : t.cardNote
                  }
                  href={path("card")}
                  onClick={(event) => route(event, "card")}
                  pullable
                />
                <HomeAction
                  icon={WifiIcon}
                  label={t.homeWifi}
                  destination="wifi"
                  detail={
                    venueLoaded && !venue.wifi ? t.homeWifiAtCounter : undefined
                  }
                  href={path("wifi")}
                  onClick={(event) => route(event, "wifi")}
                />
                <HomeAction
                  icon={Star}
                  label={reviewUrl ? t.reviewAction : t.review}
                  destination="reviews"
                  href={reviewUrl || path("reviews")}
                  external={Boolean(reviewUrl)}
                  onClick={(event) =>
                    reviewUrl ? reviewClick(apiBase) : route(event, "reviews")
                  }
                />
              </div>
            </nav>
          </main>
          <footer className="papu-footer papu-home-width">
            {venue.address && (
              <div className="papu-footer-location">
                <MapPin size={15} strokeWidth={1.8} aria-hidden="true" />
                {venue.mapUrl ? (
                  <a
                    href={venue.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {venue.address}
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </a>
                ) : (
                  <span>{venue.address}</span>
                )}
              </div>
            )}
            <FooterBrand welcome={isSweeto && view === "home"} />
          </footer>
          <AnimatePresence mode="wait">
            {view !== "home" && (
              <Sheet
                key={view}
                navigation={
                  id === "sweeto" &&
                  ["menu", "card", "wifi", "reviews"].includes(view) ? (
                    <header className="guest-destination-nav">
                      <button
                        type="button"
                        className="guest-destination-back"
                        aria-label={t.returnToPrevious}
                        onClick={closeSheet}
                      >
                        <ArrowLeft size={19} aria-hidden="true" />
                      </button>
                      <span
                        className="guest-destination-venue"
                        role="img"
                        aria-label={venue.name}
                      />
                      <VenueLanguage
                        language={language}
                        onChange={changeLanguage}
                      />
                    </header>
                  ) : undefined
                }
                label={screenTitle}
                closeLabel={
                  parentView && parentView !== "home"
                    ? t.returnToPrevious
                    : t.close
                }
                onClose={closeSheet}
                view={view}
                returnsToSheet={Boolean(parentView && parentView !== "home")}
              >
                {view === "card" && <Loyalty language={language} />}
                {view === "wifi" && <Wifi language={language} />}
                {view === "wallet" && <Wallet language={language} />}
                {view === "test" && <LoyaltyTest language={language} />}
                {view === "restore" && (
                  <RestoreCard
                    language={language}
                    token={restoreToken}
                    onRestored={() => setRestoreToken("")}
                  />
                )}
                {view === "menu" && <MenuReader language={language} />}
                {view === "reviews" && (
                  <section className="sweeto-detail">
                    <span className="papu-action-icon">
                      <GoogleMark />
                    </span>
                    <h2>{t.review}</h2>
                    <p>{t.reviewText}</p>
                    {reviewUrl ? (
                      <a
                        className="sweeto-button"
                        href={reviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => reviewClick(apiBase)}
                      >
                        {t.writeReview}
                        <ArrowUpRight size={18} />
                      </a>
                    ) : (
                      <p role="status">{t.reviewUnavailable}</p>
                    )}
                  </section>
                )}
                {view === "missing" && (
                  <section className="sweeto-detail">
                    <h2>{t.missing}</h2>
                    <p>{t.missingText}</p>
                    <button
                      className="sweeto-button"
                      onClick={() => navigate("home")}
                    >
                      <ArrowLeft size={18} />
                      {t.back}
                    </button>
                  </section>
                )}
              </Sheet>
            )}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </VenueContext.Provider>
  );
}
