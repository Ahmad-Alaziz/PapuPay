import {
  ArrowRight,
  FileText,
  Maximize2,
  Minus,
  Plus,
  Trash2,
} from "papu-guest-icons";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Language } from "./catalog";
import { useVenue } from "./VenueContext";
import {
  adjustCounterDraft,
  counterDraftKey,
  counterQuantityLimit,
  counterTotal,
  emptyCounterDraft,
  readCounterDraft,
  saveCounterDraft,
  type CounterDraft,
} from "./counter-draft";

const desserts = [
  {
    id: "menu-matylda",
    photo: "/assets/sweeto/matylda.webp",
    pl: [
      "Matylda czekoladowa",
      "Intensywnie czekoladowe ciasto z błyszczącą polewą.",
    ],
    en: [
      "Matylda chocolate cake",
      "Rich chocolate cake with glossy chocolate sauce.",
    ],
    ru: [
      "Шоколадная Матильда",
      "Насыщенный шоколадный торт с блестящей шоколадной глазурью.",
    ],
  },
  {
    id: "menu-san-sebastian",
    photo: "/assets/sweeto/san-sebastian.webp",
    pl: [
      "San Sebastian z czekoladą",
      "Baskijski sernik z kremowym środkiem i gorącą czekoladą.",
    ],
    en: [
      "Chocolate San Sebastian cheesecake",
      "Basque cheesecake with a soft centre and hot chocolate sauce.",
    ],
    ru: [
      "Сан-Себастьян с шоколадом",
      "Баскский чизкейк с нежной серединой и горячим шоколадом.",
    ],
  },
  {
    id: "menu-crunch-bowl",
    photo: "/assets/sweeto/crunch-bowl.webp",
    pl: [
      "Chrupiący bowl",
      "Krem pistacjowy, świeże truskawki, chrupiący miks i ciemna czekolada.",
    ],
    en: [
      "Crunchy bowl",
      "Pistachio cream, fresh strawberries, a crunchy mix and dark chocolate.",
    ],
    ru: [
      "Хрустящий боул",
      "Фисташковый крем, свежая клубника, хрустящая смесь и тёмный шоколад.",
    ],
  },
  {
    id: "menu-forest-cloud",
    photo: "/assets/sweeto/forest-cloud.webp",
    pl: [
      "Królewska chmurka leśna",
      "Puszyste ciasto nasączone mlekiem, z serkiem śmietankowym, owocami i płynną czekoladą.",
    ],
    en: [
      "Forest cloud cake",
      "Fluffy milk-soaked cake with cream cheese, fruit and chocolate sauce.",
    ],
    ru: [
      "Королевское лесное облако",
      "Воздушный торт в молочной пропитке со сливочным сыром, фруктами и шоколадом.",
    ],
  },
] as const;

type Dessert = (typeof desserts)[number];
type Copy = (typeof copy)[Language];

const itemIDs = new Set<string>(desserts.map((dessert) => dessert.id));
const copy = {
  pl: {
    title: "Menu deserów",
    intro: "Wybierz desery i pokaż listę przy ladzie.",
    guidance: "Zamów przy ladzie. Tam sprawdzisz też ceny i dostępność.",
    original: "Oryginalne menu (PDF)",
    done: "Gotowe",
    enlarge: "Powiększ zdjęcie",
    add: "Dodaj",
    remove: "Usuń porcję",
    addToList: "Dodaj do listy",
    onList: "na liście",
    show: "Pokaż przy ladzie",
    shortList: "Lista",
    edit: "Edytuj listę",
    clear: "Wyczyść listę",
    clearQuestion: "Wyczyścić listę?",
    cancel: "Anuluj",
    handoff: "Pokaż listę obsłudze. Zamów i zapłać przy ladzie.",
  },
  en: {
    title: "Dessert menu",
    intro: "Choose desserts and show your list at the counter.",
    guidance:
      "Order at the counter, where you can check prices and availability.",
    original: "Original Polish menu (PDF)",
    done: "Done",
    enlarge: "Enlarge photo",
    add: "Add one",
    remove: "Remove one",
    addToList: "Add to list",
    onList: "on the list",
    show: "Show at the counter",
    shortList: "My list",
    edit: "Edit list",
    clear: "Clear list",
    clearQuestion: "Clear the list?",
    cancel: "Cancel",
    handoff: "Show this list to staff to order and pay at the counter.",
  },
  ru: {
    title: "Меню десертов",
    intro: "Выберите десерты и покажите список у стойки.",
    guidance: "Закажите у стойки, там же уточняйте цены и наличие.",
    original: "Оригинальное меню по-польски (PDF)",
    done: "Готово",
    enlarge: "Увеличить фото",
    add: "Добавить",
    remove: "Убрать порцию",
    addToList: "В список",
    onList: "в списке",
    show: "Покажите у стойки",
    shortList: "Список",
    edit: "Изменить список",
    clear: "Очистить список",
    clearQuestion: "Очистить список?",
    cancel: "Отмена",
    handoff: "Покажите список сотрудникам. Закажите и оплатите у стойки.",
  },
};

const motionPreference = "(prefers-reduced-motion: reduce)";
export const dessertOverlayHistoryKey = "sweetoDessertOverlay";
type Overlay = { kind: "photo"; id: string } | { kind: "counter" };
type Presentation = { route: Overlay; origin?: DOMRect };

function overlayFromHistory(): Overlay | null {
  const value = history.state?.[dessertOverlayHistoryKey];
  if (value?.kind === "counter") return { kind: "counter" };
  if (value?.kind === "photo" && itemIDs.has(value.id))
    return { kind: "photo", id: value.id };
  return null;
}

function removeOverlayMarker() {
  const state = { ...history.state };
  delete state[dessertOverlayHistoryKey];
  history.replaceState(state, "");
}

function selectionSummary(total: number, language: Language) {
  const plural = new Intl.PluralRules(language).select(total);
  const nouns =
    language === "pl"
      ? { one: "porcja", few: "porcje", other: "porcji", many: "porcji" }
      : language === "ru"
        ? { one: "порция", few: "порции", other: "порций", many: "порций" }
        : {
            one: "portion",
            few: "portions",
            other: "portions",
            many: "portions",
          };
  const noun =
    plural === "one" || plural === "few" || plural === "many"
      ? nouns[plural]
      : nouns.other;
  return `${total} ${noun}`;
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

function MenuOverlay({
  label,
  closeLabel,
  className,
  origin,
  onClose,
  returnFocus,
  children,
}: {
  label: string;
  closeLabel: string;
  className: string;
  origin?: DOMRect;
  onClose: () => void;
  returnFocus: () => void;
  children: ReactNode;
}) {
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
      className={`papu-menu-overlay ${className}`}
      aria-label={label}
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
            {closeLabel}
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

function QuantityButton({
  increment,
  name,
  quantity,
  t,
  change,
}: {
  increment: boolean;
  name: string;
  quantity: number;
  t: Copy;
  change: (delta: 1 | -1) => void;
}) {
  const Icon = increment ? Plus : Minus;
  const label = increment ? t.add : t.remove;
  return (
    <button
      type="button"
      className={`papu-menu-adjust ${increment ? "is-add" : "is-remove"}`}
      aria-label={`${label}: ${name}, ${quantity} ${t.onList}`}
      disabled={increment ? quantity >= counterQuantityLimit : quantity === 0}
      onClick={() => change(increment ? 1 : -1)}
    >
      <Icon size={19} aria-hidden="true" />
    </button>
  );
}

function QuantityPicker({
  name,
  quantity,
  t,
  change,
  rail = false,
}: {
  name: string;
  quantity: number;
  t: Copy;
  change: (delta: 1 | -1) => void;
  rail?: boolean;
}) {
  const picker = useRef<HTMLDivElement>(null);
  const focusAdd = useRef(false);
  function adjust(delta: 1 | -1) {
    if (delta < 0 && quantity === 1) {
      focusAdd.current =
        picker.current?.contains(document.activeElement) ?? false;
    }
    change(delta);
  }
  useLayoutEffect(() => {
    if (quantity === 0 && focusAdd.current) {
      picker.current?.querySelector<HTMLButtonElement>(".is-add")?.focus();
      focusAdd.current = false;
    }
  }, [quantity]);
  const add = (
    <QuantityButton
      key="add"
      increment
      name={name}
      quantity={quantity}
      t={t}
      change={adjust}
    />
  );
  const remove =
    quantity > 0 ? (
      <QuantityButton
        key="remove"
        increment={false}
        name={name}
        quantity={quantity}
        t={t}
        change={adjust}
      />
    ) : (
      <span
        key="space"
        className="papu-menu-quantity-space"
        aria-hidden="true"
      />
    );
  const count = quantity > 0 && (
    <span key="count" className="papu-menu-quantity-count" aria-hidden="true">
      {quantity}
    </span>
  );
  return (
    <div
      ref={picker}
      className={`papu-menu-quantity ${rail ? "is-rail" : "is-stepper"}`}
      data-selected={quantity > 0}
    >
      {rail ? [add, count, remove] : [remove, count, add]}
    </div>
  );
}

function DessertDetail({
  dessert,
  language,
  quantity,
  change,
  origin,
  onClose,
  returnFocus,
  announcement,
}: {
  dessert: Dessert;
  language: Language;
  quantity: number;
  change: (delta: 1 | -1) => void;
  origin?: DOMRect;
  onClose: () => void;
  returnFocus: () => void;
  announcement: string;
}) {
  const t = copy[language];
  const [name, description] = dessert[language];
  const controls = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);
  function adjust(delta: 1 | -1) {
    if ((quantity === 0 && delta === 1) || (quantity === 1 && delta === -1)) {
      refocus.current =
        controls.current?.contains(document.activeElement) ?? false;
    }
    change(delta);
  }
  useLayoutEffect(() => {
    if (refocus.current) {
      controls.current
        ?.querySelector<HTMLButtonElement>(".is-add, .papu-menu-detail-add")
        ?.focus({ preventScroll: true });
      refocus.current = false;
    }
  }, [quantity]);
  return (
    <MenuOverlay
      label={name}
      closeLabel={t.done}
      className="papu-menu-detail-dialog"
      origin={origin}
      onClose={onClose}
      returnFocus={returnFocus}
    >
      <h2 className="papu-menu-detail-title">{name}</h2>
      <img
        src={dessert.photo}
        className="papu-menu-detail-photo"
        alt={name}
        width={589}
        height={440}
      />
      <p className="papu-menu-detail-description">{description}</p>
      <div ref={controls}>
        {quantity > 0 ? (
          <QuantityPicker
            name={name}
            quantity={quantity}
            t={t}
            change={adjust}
          />
        ) : (
          <button
            type="button"
            className="papu-menu-detail-add"
            onClick={() => adjust(1)}
          >
            <Plus size={18} aria-hidden="true" />
            {t.addToList}
          </button>
        )}
      </div>
      <span className="sweeto-sr-only" role="status">
        {announcement}
      </span>
    </MenuOverlay>
  );
}

function CounterTicket({
  draft,
  language,
  onClose,
  returnFocus,
  clear,
}: {
  draft: CounterDraft;
  language: Language;
  onClose: () => void;
  returnFocus: () => void;
  clear: () => void;
}) {
  const t = copy[language];
  const [confirming, setConfirming] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const clearTrigger = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  useLayoutEffect(() => {
    if (confirming) cancel.current?.focus();
    else if (wasConfirming.current) clearTrigger.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);
  function close() {
    if (confirming) setConfirming(false);
    else onClose();
  }
  return (
    <MenuOverlay
      label={t.show}
      closeLabel={t.edit}
      className="papu-counter-dialog"
      onClose={close}
      returnFocus={returnFocus}
    >
      <div className="papu-counter-intro">
        <h2>{t.show}</h2>
        <p>{t.handoff}</p>
      </div>
      <article className="papu-counter-ticket" aria-label={t.shortList}>
        <header>
          <img
            src="/assets/sweeto/logo-white.png"
            alt="Sweeto"
            width={398}
            height={63}
          />
          <h2 className="papu-counter-ticket-standard" lang="pl">
            Lista deserów
          </h2>
          <h2 className="papu-counter-ticket-compact">{t.shortList}</h2>
        </header>
        <div className="papu-counter-perforation" aria-hidden="true" />
        <ul>
          {desserts
            .filter((dessert) => (draft.quantities[dessert.id] ?? 0) > 0)
            .map((dessert) => (
              <li key={dessert.id} className="papu-counter-line">
                <strong className="papu-counter-line-quantity">
                  {draft.quantities[dessert.id]} ×
                </strong>
                <div>
                  <strong className="papu-counter-line-name" lang="pl">
                    {dessert.pl[0]}
                  </strong>
                  {language !== "pl" && <p>{dessert[language][0]}</p>}
                </div>
              </li>
            ))}
        </ul>
      </article>
      <p className="papu-counter-guidance-compact">{t.handoff}</p>
      {confirming ? (
        <section
          className="papu-counter-confirm"
          aria-labelledby="papu-counter-clear-question"
        >
          <h3 id="papu-counter-clear-question">{t.clearQuestion}</h3>
          <div>
            <button
              type="button"
              ref={cancel}
              onClick={() => setConfirming(false)}
            >
              {t.cancel}
            </button>
            <button
              type="button"
              className="papu-counter-confirm-clear"
              onClick={clear}
            >
              {t.clear}
            </button>
          </div>
        </section>
      ) : (
        <button
          type="button"
          ref={clearTrigger}
          className="papu-counter-clear"
          onClick={() => setConfirming(true)}
        >
          <Trash2 size={17} aria-hidden="true" />
          {t.clear}
        </button>
      )}
    </MenuOverlay>
  );
}

export default function DessertCatalog({
  language,
  onOriginal,
}: {
  language: Language;
  venueName: string;
  onOriginal: () => void;
}) {
  const { venue } = useVenue();
  const t = copy[language];
  const heading = useRef<HTMLHeadingElement>(null);
  const counterTrigger = useRef<HTMLButtonElement>(null);
  const photos = useRef(new Map<string, HTMLButtonElement>());
  const closing = useRef(false);
  const [draft, setDraft] = useState<CounterDraft>(() => {
    try {
      return readCounterDraft(localStorage, venue.id, itemIDs);
    } catch {
      return emptyCounterDraft();
    }
  });
  const draftRef = useRef(draft);
  const [announcement, setAnnouncement] = useState("");
  const [presentation, setPresentation] = useState<Presentation | null>(() => {
    const route = overlayFromHistory();
    return route ? { route } : null;
  });
  const total = counterTotal(draft);
  const summary = selectionSummary(total, language);

  function remember(next: CounterDraft) {
    draftRef.current = next;
    setDraft(next);
    try {
      saveCounterDraft(localStorage, venue.id, next);
    } catch {
      /* Continue with session-only selections. */
    }
  }

  useEffect(() => {
    function restore() {
      let next: CounterDraft;
      try {
        next = readCounterDraft(localStorage, venue.id, itemIDs);
      } catch {
        next =
          draftRef.current.expiresAt > Date.now()
            ? draftRef.current
            : emptyCounterDraft();
      }
      draftRef.current = next;
      setDraft(next);
    }
    function visible() {
      if (!document.hidden) restore();
    }
    function storage(event: StorageEvent) {
      if (event.key === counterDraftKey(venue.id) || event.key === null)
        restore();
    }
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("storage", storage);
    restore();
    return () => {
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("storage", storage);
    };
  }, [venue.id]);

  useEffect(() => {
    if (!draft.expiresAt) return;
    const timer = window.setTimeout(
      () => {
        if (draftRef.current.expiresAt <= Date.now()) {
          draftRef.current = emptyCounterDraft();
          setDraft(draftRef.current);
          try {
            saveCounterDraft(localStorage, venue.id, draftRef.current);
          } catch {
            /* Optional storage. */
          }
        }
      },
      Math.max(0, draft.expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [draft.expiresAt, venue.id]);

  useEffect(() => {
    const restore = () => {
      closing.current = false;
      const route = overlayFromHistory();
      if (
        route?.kind === "counter" &&
        (draftRef.current.expiresAt <= Date.now() ||
          counterTotal(draftRef.current) === 0)
      ) {
        removeOverlayMarker();
        setPresentation(null);
        return;
      }
      setPresentation(
        route
          ? {
              route,
              origin:
                route.kind === "photo"
                  ? photos.current
                      .get(route.id)
                      ?.querySelector("img")
                      ?.getBoundingClientRect()
                  : undefined,
            }
          : null,
      );
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  useEffect(() => {
    if (
      presentation?.route.kind === "counter" &&
      total === 0 &&
      !closing.current
    ) {
      removeOverlayMarker();
      setPresentation(null);
    }
  }, [total, presentation]);

  function changeQuantity(dessert: Dessert, delta: 1 | -1) {
    const next = adjustCounterDraft(draftRef.current, dessert.id, delta);
    remember(next);
    setAnnouncement(
      `${next.quantities[dessert.id] ?? 0} × ${dessert[language][0]} ${t.onList}`,
    );
  }

  function present(route: Overlay) {
    if (presentation || closing.current) return;
    if (
      route.kind === "counter" &&
      (draftRef.current.expiresAt <= Date.now() ||
        counterTotal(draftRef.current) === 0)
    ) {
      remember(emptyCounterDraft());
      return;
    }
    history.pushState(
      { ...history.state, [dessertOverlayHistoryKey]: route },
      "",
    );
    setPresentation({
      route,
      origin:
        route.kind === "photo"
          ? photos.current
              .get(route.id)
              ?.querySelector("img")
              ?.getBoundingClientRect()
          : undefined,
    });
  }

  function close() {
    if (closing.current) return;
    if (overlayFromHistory()) {
      closing.current = true;
      history.back();
    } else setPresentation(null);
  }

  function returnFocus() {
    const route = presentation?.route;
    const target =
      route?.kind === "photo"
        ? photos.current.get(route.id)
        : counterTotal(draftRef.current) > 0
          ? counterTrigger.current
          : heading.current;
    (target?.isConnected ? target : heading.current)?.focus({
      preventScroll: true,
    });
  }

  const activeRoute = presentation?.route;
  const shownDessert =
    activeRoute?.kind === "photo"
      ? desserts.find((dessert) => dessert.id === activeRoute.id)
      : undefined;
  const showingCounter = presentation?.route.kind === "counter" && total > 0;

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
          const [name, description] = dessert[language];
          const quantity = draft.quantities[dessert.id] ?? 0;
          return (
            <li className="papu-dessert-item" key={dessert.id}>
              <div className="papu-dessert-row">
                <button
                  ref={(element) => {
                    if (element) photos.current.set(dessert.id, element);
                    else photos.current.delete(dessert.id);
                  }}
                  type="button"
                  className="papu-menu-thumbnail"
                  aria-label={`${t.enlarge}: ${name}`}
                  aria-haspopup="dialog"
                  onClick={() => present({ kind: "photo", id: dessert.id })}
                >
                  <img
                    src={dessert.photo}
                    alt=""
                    width={589}
                    height={440}
                    decoding="async"
                  />
                  <span className="papu-menu-expand" aria-hidden="true">
                    <Maximize2 size={12} />
                  </span>
                  {quantity > 0 && (
                    <span className="papu-menu-photo-count" aria-hidden="true">
                      {quantity}
                    </span>
                  )}
                </button>
                <div className="papu-dessert-info">
                  <h3>{name}</h3>
                  <p>{description}</p>
                </div>
                <QuantityPicker
                  rail
                  name={name}
                  quantity={quantity}
                  t={t}
                  change={(delta) => changeQuantity(dessert, delta)}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <footer className="papu-dessert-footer">
        <p className="papu-dessert-order">{t.guidance}</p>
        <button
          type="button"
          className="papu-dessert-archive"
          onClick={onOriginal}
        >
          <FileText size={17} aria-hidden="true" />
          {t.original}
        </button>
      </footer>
      {total > 0 && (
        <div className="papu-counter-dock">
          <button
            ref={counterTrigger}
            type="button"
            className="papu-counter-open"
            aria-label={`${t.show}, ${summary}`}
            aria-haspopup="dialog"
            onClick={() => present({ kind: "counter" })}
          >
            <span className="papu-counter-open-copy">
              <span className="papu-counter-open-full">{t.show}</span>
              <span className="papu-counter-open-detail">{summary}</span>
              <span className="papu-counter-open-compact">
                {t.shortList} • {total}
              </span>
            </span>
            <span className="papu-counter-arrow" aria-hidden="true">
              <ArrowRight size={18} />
            </span>
          </button>
        </div>
      )}
      {!presentation && (
        <span className="sweeto-sr-only" role="status">
          {announcement}
        </span>
      )}
      {shownDessert && (
        <DessertDetail
          key={shownDessert.id}
          dessert={shownDessert}
          language={language}
          quantity={draft.quantities[shownDessert.id] ?? 0}
          change={(delta) => changeQuantity(shownDessert, delta)}
          origin={presentation?.origin}
          onClose={close}
          returnFocus={returnFocus}
          announcement={announcement}
        />
      )}
      {showingCounter && (
        <CounterTicket
          draft={draft}
          language={language}
          onClose={close}
          returnFocus={returnFocus}
          clear={() => {
            close();
            remember(emptyCounterDraft());
          }}
        />
      )}
    </section>
  );
}
