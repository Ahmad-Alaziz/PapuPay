import { ChevronRight, FileText } from "papu-guest-icons";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import desserts from "../../public/assets/sweeto/desserts.json";
import type { Language } from "./catalog";
import { useVenue } from "./VenueContext";

type Dessert = (typeof desserts)[number];
const copy = {
  pl: {
    title: "Menu deserów",
    intro: "Zamów przy ladzie",
    original: "Oryginalne menu (PDF)",
    done: "Zamknij",
    polish: "W polskim menu",
    energy: "Wartość energetyczna porcji",
    kcal: "kcal",
  },
  en: {
    title: "Dessert menu",
    intro: "Order at the counter",
    original: "Original Polish menu (PDF)",
    done: "Close",
    polish: "On the Polish menu",
    energy: "Energy per serving",
    kcal: "kcal",
  },
  ru: {
    title: "Меню десертов",
    intro: "Закажите у стойки",
    original: "Оригинальное меню по-польски (PDF)",
    done: "Закрыть",
    polish: "В польском меню",
    energy: "Энергетическая ценность порции",
    kcal: "ккал",
  },
};

const motionPreference = "(prefers-reduced-motion: reduce)";
export const dessertOverlayHistoryKey = "sweetoDessertOverlay";
type Presentation = { dessert: Dessert; origin?: DOMRect };

function dessertFromHistory() {
  const marker = history.state?.[dessertOverlayHistoryKey];
  return marker?.kind === "photo"
    ? desserts.find((dessert) => dessert.id === marker.id)
    : undefined;
}

function liftThumbnail(
  dialog: HTMLDialogElement,
  target: HTMLImageElement,
  origin: DOMRect,
) {
  const preferences = window.matchMedia(motionPreference);
  if (!origin.width || !origin.height || preferences.matches || !target.animate)
    return;
  const destination = target.getBoundingClientRect();
  if (!destination.width || !destination.height) return;
  const scale = Math.min(
    destination.width / origin.width,
    destination.height / origin.height,
  );
  const x =
    destination.left +
    (destination.width - origin.width * scale) / 2 -
    origin.left;
  const y =
    destination.top +
    (destination.height - origin.height * scale) / 2 -
    origin.top;
  const clone = document.createElement("img");
  clone.src = target.src;
  clone.alt = "";
  clone.setAttribute("aria-hidden", "true");
  clone.className = "papu-menu-photo-flight";
  Object.assign(clone.style, {
    left: `${origin.left}px`,
    top: `${origin.top}px`,
    width: `${origin.width}px`,
    height: `${origin.height}px`,
  });
  dialog.append(clone);
  target.style.visibility = "hidden";
  const animation = clone.animate(
    [
      { transform: "translate(0, 0) scale(1)" },
      { transform: `translate(${x}px, ${y}px) scale(${scale})` },
    ],
    { duration: 260, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" },
  );
  let settled = false;
  function cleanup() {
    if (settled) return;
    settled = true;
    target.style.visibility = "";
    clone.remove();
    animation.cancel();
    preferences.removeEventListener("change", cleanup);
  }
  animation.finished.then(cleanup, cleanup);
  preferences.addEventListener("change", cleanup);
  return cleanup;
}

function DessertDetail({
  dessert,
  language,
  kcal,
  origin,
  onClose,
  returnFocus,
}: {
  dessert: Dessert;
  language: Language;
  kcal?: number;
  origin?: DOMRect;
  onClose: () => void;
  returnFocus: () => void;
}) {
  const t = copy[language];
  const { name, description } = dessert[language];
  const host = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const focus = useRef(returnFocus);
  focus.current = returnFocus;
  useLayoutEffect(() => {
    const dialog = host.current;
    if (!dialog) return;
    dialog.showModal();
    close.current?.focus({ preventScroll: true });
    const image = dialog.querySelector<HTMLImageElement>(
      ".papu-menu-detail-photo",
    );
    const stop =
      image && origin ? liftThumbnail(dialog, image, origin) : undefined;
    return () => {
      stop?.();
      dialog.close();
      focus.current();
    };
  }, [origin]);

  return (
    <dialog
      ref={host}
      className="papu-menu-overlay"
      aria-labelledby="papu-menu-detail-title"
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="papu-menu-overlay-body">
        <div className="papu-menu-overlay-controls">
          <button
            type="button"
            ref={close}
            className="papu-menu-overlay-close"
            onClick={onClose}
          >
            {t.done}
          </button>
        </div>
        <img
          className="papu-menu-detail-photo"
          src={dessert.photo}
          alt=""
          width={589}
          height={440}
        />
        <h2 id="papu-menu-detail-title" className="papu-menu-detail-title">
          {name}
        </h2>
        <p className="papu-menu-detail-description">{description}</p>
        {(language !== "pl" || kcal !== undefined) && (
          <dl className="papu-menu-facts">
            {language !== "pl" && (
              <div>
                <dt>{t.polish}</dt>
                <dd lang="pl">{dessert.pl.name}</dd>
              </div>
            )}
            {kcal !== undefined && (
              <div>
                <dt>{t.energy}</dt>
                <dd>
                  {kcal.toLocaleString(language)} {t.kcal}
                </dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </dialog>
  );
}

export default function DessertCatalog({
  language,
  onOriginal,
}: {
  language: Language;
  onOriginal: () => void;
}) {
  const { venue } = useVenue();
  const t = copy[language];
  const heading = useRef<HTMLHeadingElement>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const closing = useRef(false);
  const [presentation, setPresentation] = useState<Presentation | null>(() => {
    const dessert = dessertFromHistory();
    return dessert ? { dessert } : null;
  });

  useEffect(() => {
    function restore() {
      closing.current = false;
      const dessert = dessertFromHistory();
      setPresentation(
        dessert
          ? {
              dessert,
              origin: triggers.current
                .get(dessert.id)
                ?.querySelector("img")
                ?.getBoundingClientRect(),
            }
          : null,
      );
    }
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  function open(dessert: Dessert, trigger: HTMLButtonElement) {
    history.pushState(
      {
        ...history.state,
        [dessertOverlayHistoryKey]: { kind: "photo", id: dessert.id },
      },
      "",
    );
    setPresentation({
      dessert,
      origin: trigger.querySelector("img")?.getBoundingClientRect(),
    });
  }

  function close() {
    if (closing.current) return;
    if (dessertFromHistory()) {
      closing.current = true;
      history.back();
    } else setPresentation(null);
  }

  return (
    <section
      className="sweeto-menu-reader papu-dessert-catalog"
      aria-labelledby="papu-dessert-title"
      lang={language}
    >
      <header className="papu-dessert-heading">
        <h2 id="papu-dessert-title" ref={heading} tabIndex={-1}>
          {t.title}
        </h2>
        <p>{t.intro}</p>
      </header>
      <ul className="papu-dessert-list" role="list">
        {desserts.map((dessert) => {
          const { name, summary } = dessert[language];
          return (
            <li className="papu-dessert-item" key={dessert.id}>
              <button
                ref={(element) => {
                  if (element) triggers.current.set(dessert.id, element);
                  else triggers.current.delete(dessert.id);
                }}
                type="button"
                className="papu-menu-open-detail"
                aria-haspopup="dialog"
                aria-label={name}
                aria-describedby={dessert.id + "-summary"}
                onClick={(event) => open(dessert, event.currentTarget)}
              >
                <span className="papu-menu-thumbnail">
                  <img
                    src={dessert.photo}
                    alt=""
                    width={589}
                    height={440}
                    decoding="async"
                  />
                </span>
                <span className="papu-dessert-info">
                  <strong>{name}</strong>
                  <span id={dessert.id + "-summary"}>{summary}</span>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      <footer className="papu-dessert-footer">
        <button
          className="papu-dessert-archive"
          type="button"
          onClick={onOriginal}
        >
          <FileText size={16} aria-hidden="true" />
          {t.original}
        </button>
      </footer>
      {presentation && (
        <DessertDetail
          key={presentation.dessert.id}
          dessert={presentation.dessert}
          language={language}
          kcal={venue.dessertKcalPerServing?.[presentation.dessert.id]}
          origin={presentation.origin}
          onClose={close}
          returnFocus={() => {
            const trigger = triggers.current.get(presentation.dessert.id);
            (trigger?.isConnected ? trigger : heading.current)?.focus({
              preventScroll: true,
            });
          }}
        />
      )}
    </section>
  );
}
