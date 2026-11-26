import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, Minus, Plus } from "papu-guest-icons";
import DessertCatalog, { dessertOverlayHistoryKey } from "./DessertCatalog";
import type { VenueStatus } from "./api";
import type { Language } from "./catalog";
import { useVenue } from "./VenueContext";
import "./menu-reader.css";

const text = {
  pl: {
    title: "Menu",
    originalTitle: "Oryginalne menu",
    catalog: "Wróć do menu deserów",
    zoom: "Powiększ menu",
    fit: "Dopasuj do szerokości ekranu",
    language: "Menu w języku polskim",
    unavailable: "Menu jest chwilowo niedostępne",
    open: "Otwórz menu PDF",
    newTab: "otwiera w nowej karcie",
    loading: "Wczytujemy menu…",
    pdfLoading: "Wczytujemy podgląd PDF…",
    pdfUnavailable: "Nie udało się wczytać podglądu PDF",
    pdfHelp: "Otwórz plik PDF, aby przejrzeć wszystkie strony menu.",
    retry: "Spróbuj ponownie",
  },
  en: {
    title: "Menu",
    originalTitle: "Original menu",
    catalog: "Back to dessert menu",
    zoom: "Enlarge menu",
    fit: "Fit to screen width",
    language: "Menu in Polish",
    unavailable: "The menu is temporarily unavailable",
    open: "Open the menu PDF",
    newTab: "opens in a new tab",
    loading: "Loading the menu…",
    pdfLoading: "Loading the PDF preview…",
    pdfUnavailable: "The PDF preview couldn't load",
    pdfHelp: "Open the PDF to browse every page of the menu.",
    retry: "Try again",
  },
  ru: {
    title: "Меню",
    originalTitle: "Оригинальное меню",
    catalog: "Вернуться в меню десертов",
    zoom: "Увеличить меню",
    fit: "По ширине экрана",
    language: "Меню на польском языке",
    unavailable: "Меню временно недоступно",
    open: "Открыть меню PDF",
    newTab: "откроется в новой вкладке",
    loading: "Загружается меню…",
    pdfLoading: "Загружается предпросмотр PDF…",
    pdfUnavailable: "Не удалось загрузить предпросмотр PDF",
    pdfHelp: "Откройте PDF, чтобы просмотреть все страницы меню.",
    retry: "Попробовать снова",
  },
};

type ReaderText = (typeof text)[Language];
type LoadStatus = "loading" | "ready" | "error";

function retrySource(source: string, attempt: number) {
  if (!attempt) return source;
  const url = new URL(source, location.href);
  if (url.origin !== location.origin || url.search) return source;
  url.searchParams.set("menu-retry", String(attempt));
  return url.href;
}

function PdfLink({
  source,
  strings,
  compact = false,
}: {
  source: string;
  strings: ReaderText;
  compact?: boolean;
}) {
  const linkText = compact ? "PDF" : strings.open;
  return (
    <a
      className={compact ? undefined : "sweeto-reader-open"}
      href={source}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${strings.open} (${strings.newTab})`}
    >
      {linkText}
      <ArrowUpRight size={16} aria-hidden="true" />
    </a>
  );
}

function PdfPreview({
  source,
  label,
  strings,
}: {
  source: string;
  label: string;
  strings: ReaderText;
}) {
  const region = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const src = retrySource(source, attempt);

  useEffect(() => {
    const url = new URL(src, location.href);
    if (url.origin !== location.origin) return;
    const controller = new AbortController();
    // Frame load events do not distinguish rendered PDFs from error documents.
    void fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
    })
      .then((response) => {
        if (
          controller.signal.aborted ||
          response.type === "opaqueredirect" ||
          response.status === 405 ||
          response.status === 501
        )
          return;
        const contentType = response.headers.get("content-type") ?? "";
        if (
          !response.ok ||
          /^(text\/html|application\/json)\b/i.test(contentType)
        )
          setStatus("error");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, [src]);

  return (
    <div
      className="sweeto-reader-pdf-preview"
      ref={region}
      role="region"
      aria-label={label}
      tabIndex={-1}
    >
      {status !== "error" && (
        <iframe
          key={attempt}
          className="sweeto-pdf"
          title={label}
          src={src}
          onLoad={() =>
            setStatus((previous) => (previous === "error" ? previous : "ready"))
          }
          onError={() => setStatus("error")}
        />
      )}
      {status === "loading" && (
        <p className="sweeto-reader-pdf-loading" role="status">
          {strings.pdfLoading}
        </p>
      )}
      {status === "error" && (
        <div className="sweeto-reader-state">
          <p role="alert">{strings.pdfUnavailable}</p>
          <button
            className="sweeto-reader-retry"
            type="button"
            onClick={() => {
              region.current?.focus({ preventScroll: true });
              setStatus("loading");
              setAttempt((count) => count + 1);
            }}
          >
            {strings.retry}
          </button>
          <PdfLink source={source} strings={strings} />
        </div>
      )}
    </div>
  );
}

function MenuDocument({
  image,
  pdf,
  label,
  strings,
  venueName,
  polishOnly,
  onCatalog,
}: {
  image?: string;
  pdf?: string;
  label: string;
  strings: ReaderText;
  venueName: string;
  polishOnly: boolean;
  onCatalog?: () => void;
}) {
  const pan = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const zoomCenter = useRef<{ x: number; y: number } | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const [nativePdf] = useState(
    () =>
      window.matchMedia("(max-width: 700px), (pointer: coarse)").matches ||
      navigator.pdfViewerEnabled === false,
  );

  function toggleZoom() {
    if (status !== "ready" || !pan.current) return;
    const {
      scrollLeft,
      scrollTop,
      scrollWidth,
      scrollHeight,
      clientWidth,
      clientHeight,
    } = pan.current;
    zoomCenter.current = {
      x: (scrollLeft + clientWidth / 2) / scrollWidth,
      y: (scrollTop + clientHeight / 2) / scrollHeight,
    };
    setZoomed((value) => !value);
  }

  useLayoutEffect(() => {
    if (!zoomCenter.current || !pan.current) return;
    const { x, y } = zoomCenter.current;
    const viewport = pan.current;
    viewport.scrollLeft = x * viewport.scrollWidth - viewport.clientWidth / 2;
    viewport.scrollTop = y * viewport.scrollHeight - viewport.clientHeight / 2;
    zoomCenter.current = null;
  }, [zoomed]);

  function retryImage() {
    heading.current?.focus({ preventScroll: true });
    setZoomed(false);
    setStatus("loading");
    setAttempt((count) => count + 1);
  }

  return (
    <section
      className="sweeto-menu-reader"
      aria-labelledby="sweeto-reader-title"
    >
      <header className="sweeto-reader-toolbar">
        <div className="sweeto-reader-heading">
          <span className="sweeto-reader-mark" aria-hidden="true">
            <BookOpen size={23} strokeWidth={1.7} />
          </span>
          <div>
            <p>{venueName}</p>
            <h2 id="sweeto-reader-title" ref={heading} tabIndex={-1}>
              {onCatalog ? strings.originalTitle : strings.title}
            </h2>
          </div>
        </div>
        {(image || (pdf && !nativePdf)) && (
          <div className="sweeto-reader-controls">
            {image && (
              <button
                type="button"
                aria-label={zoomed ? strings.fit : strings.zoom}
                disabled={status !== "ready"}
                onClick={toggleZoom}
              >
                {zoomed ? (
                  <Minus size={18} aria-hidden="true" />
                ) : (
                  <Plus size={18} aria-hidden="true" />
                )}
              </button>
            )}
            {pdf && <PdfLink source={pdf} strings={strings} compact />}
          </div>
        )}
      </header>
      {(onCatalog || polishOnly) && (
        <div className="sweeto-reader-context">
          {onCatalog && (
            <button
              className="papu-dessert-archive papu-dessert-return"
              type="button"
              onClick={onCatalog}
            >
              <ArrowLeft size={17} aria-hidden="true" />
              {strings.catalog}
            </button>
          )}
          {polishOnly && (
            <p className="sweeto-reader-caption">{strings.language}</p>
          )}
        </div>
      )}
      {image ? (
        <div className="sweeto-reader-image-preview" data-status={status}>
          <div
            className="sweeto-menu-pan"
            ref={pan}
            tabIndex={status === "ready" ? 0 : -1}
            role="region"
            aria-label={label}
            aria-busy={status === "loading"}
          >
            <img
              key={attempt}
              className={
                zoomed ? "sweeto-menu-artwork is-zoomed" : "sweeto-menu-artwork"
              }
              src={retrySource(image, attempt)}
              width={1120}
              height={1588}
              alt={label}
              onLoad={() => setStatus("ready")}
              onError={() => setStatus("error")}
              onDoubleClick={toggleZoom}
            />
          </div>
          {status !== "ready" && (
            <div className="sweeto-reader-state">
              {status === "loading" ? (
                <p role="status">{strings.loading}</p>
              ) : (
                <>
                  <p role="alert">{strings.unavailable}</p>
                  <button
                    className="sweeto-reader-retry"
                    type="button"
                    onClick={retryImage}
                  >
                    {strings.retry}
                  </button>
                  {pdf && <PdfLink source={pdf} strings={strings} />}
                </>
              )}
            </div>
          )}
        </div>
      ) : pdf ? (
        nativePdf ? (
          <div className="sweeto-reader-native-pdf">
            <p>{strings.pdfHelp}</p>
            <PdfLink source={pdf} strings={strings} />
          </div>
        ) : (
          <PdfPreview source={pdf} label={label} strings={strings} />
        )
      ) : (
        <p className="sweeto-reader-fallback">{strings.unavailable}</p>
      )}
    </section>
  );
}

export function venueMenu(venue: VenueStatus, language: Language) {
  const preferred = venue.menuPdf?.[language];
  const polish = venue.menuPdf?.pl;
  const custom = preferred || polish;
  const pdf =
    custom ||
    venue.menuFallback ||
    (venue.id === "sweeto" ? "/assets/sweeto/menu.pdf" : undefined);
  const image = custom ? undefined : venue.menuImageUrl;
  const polishOnly =
    language !== "pl" &&
    !preferred &&
    (Boolean(polish) || venue.id === "sweeto") &&
    Boolean(image || pdf);
  return { pdf, image, polishOnly };
}

export default function MenuReader({ language }: { language: Language }) {
  const { venue } = useVenue();
  const strings = text[language];
  const { pdf, image, polishOnly } = venueMenu(venue, language);
  const bundledDesserts =
    venue.id === "sweeto" &&
    image === "/assets/sweeto/menu-original.jpg" &&
    pdf === "/assets/sweeto/menu.pdf";
  const [original, setOriginal] = useState(false);
  const focusHeading = useRef(false);
  const catalog = bundledDesserts && !original;

  useEffect(() => {
    if (!bundledDesserts) return;
    function restoreOverlay() {
      if (history.state?.[dessertOverlayHistoryKey]) setOriginal(false);
    }
    window.addEventListener("popstate", restoreOverlay);
    return () => window.removeEventListener("popstate", restoreOverlay);
  }, [bundledDesserts]);

  function switchMenu(showOriginal: boolean) {
    focusHeading.current = true;
    setOriginal(showOriginal);
  }

  useLayoutEffect(() => {
    if (!focusHeading.current) return;
    focusHeading.current = false;
    document
      .getElementById(catalog ? "papu-dessert-title" : "sweeto-reader-title")
      ?.focus();
  }, [catalog]);

  if (catalog) {
    return (
      <DessertCatalog
        language={language}
        venueName={venue.name}
        onOriginal={() => switchMenu(true)}
      />
    );
  }
  return (
    <MenuDocument
      key={`${image ?? ""}:${pdf ?? ""}`}
      image={image}
      pdf={pdf}
      label={`${venue.name} — ${strings.title}${polishOnly ? ` (${strings.language})` : ""}`}
      strings={strings}
      venueName={venue.name}
      polishOnly={polishOnly}
      onCatalog={bundledDesserts ? () => switchMenu(false) : undefined}
    />
  );
}
