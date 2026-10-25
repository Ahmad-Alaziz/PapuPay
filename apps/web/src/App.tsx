import { useEffect, useState, lazy, Suspense, useRef } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Beef,
  Check,
  ChefHat,
  ChevronDown,
  Clock,
  Compass,
  Leaf,
  Map,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Soup,
  Sparkles,
  Ticket,
  UtensilsCrossed,
  X,
  Zap,
  GlassWater,
  Pizza,
  LockKeyhole,
  QrCode,
} from "lucide-react";
import {
  restaurants,
  menu,
  dishFor,
  restaurantFor,
  price,
  cartTotal,
  linePrice,
  groupCart,
  addLine,
  readStore,
  createOrders,
  statusFor,
} from "./domain";
import type { Restaurant, Dish } from "./domain";
import HallMap from "./HallMap";
import OrderTicket from "./OrderTicket";
import { qrPath, type OrderContext } from "./routing";
import Modal from "./Modal";
import CravingHero from "./CravingHero";
const PapuMotion = lazy(() =>
  import("./PapuMotion").catch(() => ({
    default: function MotionFallback(_props: {
      celebrate?: boolean;
      scan?: boolean;
      scene?: number;
    }) {
      return (
        <div className="papu-motion" aria-hidden="true">
          <img src="/assets/papaya-3d.webp" alt="" />
        </div>
      );
    },
  })),
);
type Tab = "discover" | "map" | "orders";
const validTab = (): Tab =>
  ["map", "orders"].includes(location.hash.slice(1))
    ? (location.hash.slice(1) as Tab)
    : "discover";
const foodImage = (image: string) => `/assets/${image}`;
function Papaya({ className = "" }: { className?: string }) {
  return <img className={className} src="/assets/papaya-3d.webp" alt="" />;
}
function Brand() {
  return (
    <span className="brand">
      <Papaya />
      <span>
        Papu<span>Pay</span>
      </span>
    </span>
  );
}
function FoodImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      className={className}
      src={foodImage(src)}
      alt={alt}
      loading="lazy"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = "/assets/hall.jpg";
      }}
    />
  );
}
export default function App({ context }: { context: OrderContext }) {
  const [store, setStore] = useState(() => {
    try {
      return readStore(localStorage.getItem("papupay-v1"));
    } catch {
      return readStore(null);
    }
  });
  const { cart, orders, locale } = store,
    pl = locale === "pl";
  const t = (a: string, b: string) => (pl ? a : b);
  const [tab, setTab] = useState<Tab>(validTab),
    [table, setTable] = useState(context.table);
  const [category, setCategory] = useState("all"),
    [search, setSearch] = useState(""),
    [onlyVeg, setOnlyVeg] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null),
    [dish, setDish] = useState<Dish | null>(null),
    [quantity, setQuantity] = useState(1),
    [extra, setExtra] = useState(false),
    [note, setNote] = useState("");
  const [cartOpen, setCartOpen] = useState(false),
    [checkout, setCheckout] = useState(false),
    [name, setName] = useState(""),
    [paying, setPaying] = useState(false),
    [success, setSuccess] = useState(false);
  const [tour, setTour] = useState<number | null>(null),
    [info, setInfo] = useState(false),
    [tableDialog, setTableDialog] = useState(false),
    [tableInput, setTableInput] = useState(table),
    [tableError, setTableError] = useState("");
  const [mapSelection, setMapSelection] = useState("atom"),
    [toast, setToast] = useState(""),
    [now, setNow] = useState(Date.now()),
    [kitchen, setKitchen] = useState(false),
    [storageError, setStorageError] = useState(false);
  const [lastAdded, setLastAdded] = useState<{
    item: Dish;
    quantity: number;
    limited: boolean;
    id: number;
  } | null>(null);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistedSnapshot = useRef<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    paymentTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    payingRef = useRef(false);
  useEffect(() => {
    const snapshot = JSON.stringify(store);
    if (snapshot === persistedSnapshot.current) return;
    try {
      localStorage.setItem("papupay-v1", snapshot);
      persistedSnapshot.current = snapshot;
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [store]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = "PapuPay · Hala Koszyki";
  }, [locale]);
  useEffect(() => {
    const hash = () => setTab(validTab());
    const sync = (e: StorageEvent) => {
      if (e.key !== "papupay-v1") return;
      const incoming = readStore(e.newValue);
      const snapshot = JSON.stringify(incoming);
      if (snapshot === persistedSnapshot.current) return;
      // Accept another tab's state without echoing a schema-normalized copy back.
      // This also prevents older tabs reintroducing removed favorites in a loop.
      persistedSnapshot.current = snapshot;
      setStore(incoming);
      setStorageError(false);
    };
    window.addEventListener("hashchange", hash);
    window.addEventListener("storage", sync);
    return () => {
      if (addedTimer.current) clearTimeout(addedTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (paymentTimer.current) clearTimeout(paymentTimer.current);
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const count = cart.reduce((n, x) => n + x.quantity, 0),
    total = cartTotal(cart),
    activeOrders = orders.filter((o) => !o.collected);
  const notify = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  };
  const [alertMessage, setAlertMessage] = useState("");
  const notified = useRef(
    new Set(orders.filter((o) => o.readyAt <= Date.now()).map((o) => o.id)),
  );
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const sync = () => {
      clearTimeout(timer);
      const time = Date.now();
      setNow(time);
      const newlyReady = orders.filter(
        (o) => !o.collected && o.readyAt <= time && !notified.current.has(o.id),
      );
      for (const o of newlyReady) {
        notified.current.add(o.id);
        const r = restaurantFor(o.restaurantId);
        const message = `${r.name} · ${t("Pora na papu! Lokal", "Your papu is ready! Unit")} ${r.unit}`;
        notify(message);
        if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
        if (
          "Notification" in window &&
          Notification.permission === "granted" &&
          document.hidden
        ) {
          try {
            const n = new Notification(
              t("Pora na papu!", "Your papu is ready!"),
              { body: message, tag: o.id, icon: "/assets/papaya-3d.webp" },
            );
            n.onclick = () => {
              window.focus();
              setCartOpen(false);
              setSuccess(false);
              location.hash = "orders";
              n.close();
            };
          } catch {
            /* Mobile browsers may require a Home Screen web app and Web Push. */
          }
        }
      }
      const next = orders
        .filter((o) => !o.collected)
        .flatMap((o) => [o.createdAt + 3001, o.readyAt])
        .filter((d) => d > time);
      if (next.length) timer = setTimeout(sync, Math.min(...next) - time + 20);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [orders, locale]);
  const enableAlerts = async () => {
    if (!("Notification" in window)) {
      setAlertMessage(
        t(
          "Zostaw tę kartę otwartą — pokażemy gotowe zamówienie tutaj.",
          "Keep this tab open — we’ll show your ready order here.",
        ),
      );
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setAlertMessage(
        permission === "granted"
          ? t(
              "Alerty włączone. Zostaw kartę otwartą w tle.",
              "Alerts enabled. Keep this tab open in the background.",
            )
          : t(
              "Powiadomienia wyłączone. Status zobaczysz tutaj.",
              "Notifications are off. Follow your order here.",
            ),
      );
    } catch {
      setAlertMessage(
        t(
          "Ten browser nie obsługuje alertów. Status zobaczysz tutaj.",
          "This browser cannot send alerts. Follow your order here.",
        ),
      );
    }
  };
  const navigate = (destination: Tab) => {
    setTab(destination);
    location.hash = destination;
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const add = (item: Dish, qty = 1, withExtra = false, message = "") => {
    const existing = cart.find(
      (line) =>
        line.itemId === item.id &&
        line.extra === withExtra &&
        line.note === message.trim().slice(0, 180),
    );
    const addedQuantity = Math.min(qty, 20 - (existing?.quantity ?? 0));
    if (addedQuantity > 0)
      setStore((s) => ({
        ...s,
        cart: addLine(s.cart, item.id, addedQuantity, withExtra, message),
      }));
    setLastAdded({
      item,
      quantity: addedQuantity || 20,
      limited: addedQuantity === 0,
      id: Date.now(),
    });
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setLastAdded(null), 7000);
    if (navigator.vibrate) navigator.vibrate(12);
  };
  const chooseDish = (item: Dish) => {
    setQuantity(1);
    setExtra(false);
    setNote("");
    setDish(item);
  };
  const updateQuantity = (id: string, delta: number) =>
    setStore((s) => ({
      ...s,
      cart: s.cart
        .map((x) =>
          x.id === id
            ? { ...x, quantity: Math.min(20, x.quantity + delta) }
            : x,
        )
        .filter((x) => x.quantity > 0),
    }));
  const filteredRestaurants = restaurants.filter(
    (r) =>
      (category === "all" || r.category === category) &&
      (!onlyVeg || menu.some((m) => m.restaurantId === r.id && m.vegetarian)) &&
      `${r.name} ${r.cuisine} ${r.cuisineEn} ${menu
        .filter((m) => m.restaurantId === r.id)
        .map((m) => m.name + " " + m.nameEn)
        .join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const confirmationReady =
    orders.length > 0 &&
    orders
      .filter((order) => order.createdAt === orders[0].createdAt)
      .every((order) => order.readyAt <= now);
  const pay = () => {
    if (payingRef.current || !cart.length) return;
    payingRef.current = true;
    setPaying(true);
    const snapshot = structuredClone(cart);
    paymentTimer.current = setTimeout(() => {
      const next = createOrders(snapshot, table, name);
      setStore((s) => ({ ...s, cart: [], orders: [...next, ...s.orders] }));
      setPaying(false);
      payingRef.current = false;
      setCheckout(false);
      setCartOpen(false);
      setLastAdded(null);
      setSuccess(true);
      navigate("orders");
    }, 1400);
  };
  const navItems = [
    { id: "discover" as Tab, Icon: Compass, label: t("Odkrywaj", "Discover") },
    { id: "map" as Tab, Icon: Map, label: t("Mapa hali", "Hall map") },
    { id: "orders" as Tab, Icon: Ticket, label: t("Zamówienia", "Orders") },
  ];
  const categories = [
    { id: "all", Icon: UtensilsCrossed, label: t("Wszystko", "Everything") },
    { id: "burgers", Icon: Beef, label: t("Burgery", "Burgers") },
    { id: "asian", Icon: Soup, label: t("Azja", "Asian") },
    { id: "pizza", Icon: Pizza, label: t("Pizza i pasta", "Pizza & pasta") },
    { id: "street", Icon: Zap, label: "Street food" },
    { id: "veggie", Icon: Leaf, label: "Vege" },
    { id: "drinks", Icon: GlassWater, label: t("Napoje", "Drinks") },
  ];
  const browse = () => {
    navigate("discover");
    setTimeout(
      () =>
        document
          .getElementById("restaurants")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      100,
    );
  };
  const openBasket = () => {
    setRestaurant(null);
    setDish(null);
    setCheckout(false);
    setCartOpen(true);
  };
  const addedNotice = (inBasket = false) =>
    lastAdded && (
      <motion.div
        className={`basket-feedback ${inBasket ? "in-basket" : ""}`}
        key={lastAdded.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}
      >
        <img src={foodImage(lastAdded.item.image)} alt="" />
        <div
          className="basket-feedback-copy"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <strong>
            <Check size={14} />
            {lastAdded.limited
              ? t("Masz już 20 w koszyku", "20 already in your basket")
              : t("Dodano do koszyka", "Added to your basket")}
          </strong>
          <span>
            {lastAdded.quantity} ×{" "}
            {pl ? lastAdded.item.name : lastAdded.item.nameEn}
          </span>
          <small>
            {t("Koszyk", "Basket")}: {count} · {price(total, locale)}
          </small>
        </div>
        {!inBasket && (
          <button onClick={openBasket}>
            {t("Zobacz koszyk", "View basket")}
            <ArrowRight size={16} />
          </button>
        )}
        <button
          className="feedback-dismiss"
          aria-label={t("Zamknij potwierdzenie", "Dismiss confirmation")}
          onClick={() => setLastAdded(null)}
        >
          <X size={16} />
        </button>
      </motion.div>
    );
  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <a className="skip-link" href="#main">
          {t("Przejdź do treści", "Skip to content")}
        </a>
        <header className="site-header">
          <div className="header-inner">
            <button
              className="brand-button"
              onClick={() => navigate("discover")}
              aria-label="PapuPay home"
            >
              <Brand />
            </button>
            <div className="venue-context">
              <span className="venue-divider" />
              <MapPin size={17} />
              <span>
                Hala Koszyki<small>WARSZAWA</small>
              </span>
            </div>
            <nav
              className="desktop-nav"
              aria-label={t("Nawigacja główna", "Main navigation")}
            >
              {navItems.map(({ id, Icon, label }) => (
                <button
                  className={tab === id ? "active" : ""}
                  key={id}
                  onClick={() => navigate(id)}
                >
                  <Icon size={18} />
                  {label}
                  {id === "orders" && activeOrders.length > 0 && (
                    <span className="tiny-count">{activeOrders.length}</span>
                  )}
                </button>
              ))}
            </nav>
            <div className="header-actions">
              <button
                className="language-button"
                onClick={() =>
                  setStore((s) => ({ ...s, locale: pl ? "en" : "pl" }))
                }
                aria-label={t("Switch to English", "Zmień na polski")}
              >
                {pl ? "PL" : "EN"}
                <ChevronDown size={12} />
              </button>
              <button
                className="table-button"
                onClick={() => {
                  setTableInput(table);
                  setTableDialog(true);
                }}
              >
                <QrCode size={18} />
                <span>
                  {t("Stolik", "Table")} <b>{table}</b>
                </span>
              </button>
              <motion.button
                animate={{ scale: count ? [1, 1.1, 1] : 1 }}
                key={count}
                className="header-cart"
                aria-label={t(
                  `Koszyk, liczba produktów: ${count}`,
                  `Basket, ${count} items`,
                )}
                onClick={() => {
                  setCheckout(false);
                  setCartOpen(true);
                }}
              >
                <ShoppingBag size={19} />
                <span>{count}</span>
              </motion.button>
            </div>
          </div>
        </header>
        <main id="main">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {tab === "discover" && (
                <motion.div
                  key="discover"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <CravingHero
                    locale={locale}
                    table={table}
                    onBrowse={browse}
                    onTour={() => setTour(0)}
                    onDish={chooseDish}
                    onMenu={(id) => setRestaurant(restaurantFor(id))}
                  />
                  <section className="discovery section" id="restaurants">
                    <div className="section-heading">
                      <div>
                        <p className="eyebrow">
                          {t("DOBRE RZECZY SĄ BLISKO", "GOOD THINGS ARE CLOSE")}
                        </p>
                        <h2>{t("Co dziś jesz?", "What’s your craving?")}</h2>
                      </div>
                      <label className="search-field">
                        <Search size={19} />
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder={t(
                            "Restauracja, danie, zachcianka…",
                            "Restaurant, dish, little craving…",
                          )}
                          aria-label={t(
                            "Szukaj restauracji lub dania",
                            "Search restaurants or dishes",
                          )}
                        />
                        {search && (
                          <button
                            aria-label={t(
                              "Wyczyść wyszukiwanie",
                              "Clear search",
                            )}
                            onClick={() => setSearch("")}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </label>
                    </div>
                    <div className="filter-row">
                      <div className="categories">
                        {categories.map(({ id, Icon, label }) => (
                          <button
                            className={`category ${category === id ? "selected" : ""}`}
                            key={id}
                            onClick={() => setCategory(id)}
                            aria-pressed={category === id}
                          >
                            <Icon size={21} />
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="filter-toggles">
                        <button
                          className={`icon-button ${onlyVeg ? "selected" : ""}`}
                          aria-label={t(
                            "Tylko z opcjami wege",
                            "Vegetarian options only",
                          )}
                          aria-pressed={onlyVeg}
                          onClick={() => setOnlyVeg(!onlyVeg)}
                        >
                          <Leaf size={19} />
                        </button>
                      </div>
                    </div>
                    <div className="results-heading">
                      <span>
                        {filteredRestaurants.length}{" "}
                        {t(
                          "miejsc na coś pysznego",
                          "places for something delicious",
                        )}
                      </span>
                      <span className="demo-label">
                        <span />
                        {t("Menu pokazowe", "Demo menus")}
                      </span>
                    </div>
                    <motion.div layout className="restaurant-grid">
                      <AnimatePresence mode="popLayout">
                        {filteredRestaurants.map((r, i) => (
                          <motion.article
                            layout
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{
                              duration: 0.25,
                              delay: Math.min(i * 0.035, 0.2),
                            }}
                            className="restaurant-card"
                            key={r.id}
                          >
                            <button
                              className="restaurant-image-button"
                              onClick={() => setRestaurant(r)}
                              aria-label={`${t("Zobacz menu", "View menu")}: ${r.name}`}
                            >
                              <FoodImage
                                src={r.image}
                                alt={pl ? r.cuisine : r.cuisineEn}
                              />
                              <span className="card-tag">
                                {pl ? r.tag : r.tagEn}
                              </span>
                              <span className="image-arrow">
                                <ArrowUpRight size={21} />
                              </span>
                            </button>
                            <button
                              className="restaurant-info"
                              onClick={() => setRestaurant(r)}
                            >
                              <div>
                                <h3>{r.name}</h3>
                                <p>{pl ? r.cuisine : r.cuisineEn}</p>
                              </div>
                              <div className="restaurant-meta">
                                <span>
                                  <Clock size={13} />
                                  {t("Demo · 12 s", "Demo · 12 sec")}
                                </span>
                                <span>
                                  {t("Lokal", "Unit")}{" "}
                                  {String(r.unit).padStart(2, "0")}
                                </span>
                              </div>
                            </button>
                          </motion.article>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                    {!filteredRestaurants.length && (
                      <div className="empty-state">
                        <Search size={38} />
                        <h3>
                          {t(
                            "Tego smaku jeszcze nie znamy",
                            "We haven’t found that flavour",
                          )}
                        </h3>
                        <p>
                          {t(
                            "Spróbuj innego hasła albo wyczyść filtry.",
                            "Try another search or clear the filters.",
                          )}
                        </p>
                        <button
                          className="secondary"
                          onClick={() => {
                            setSearch("");
                            setCategory("all");
                            setOnlyVeg(false);
                          }}
                        >
                          {t("Pokaż wszystkie", "Show everything")}
                        </button>
                      </div>
                    )}
                  </section>
                  <section className="gather-banner">
                    <div className="gather-illustration">
                      <div className="plate">
                        <UtensilsCrossed size={36} />
                      </div>
                      <span className="little-orbit">
                        <Sparkles size={24} />
                      </span>
                      <Papaya />
                    </div>
                    <div>
                      <p className="eyebrow">
                        {t(
                          "RÓŻNE APETYTY · WSPÓLNY STOLIK",
                          "DIFFERENT CRAVINGS · SAME TABLE",
                        )}
                      </p>
                      <h2>
                        {t(
                          "Ty ramen, ja burgera",
                          "You get ramen, I get a burger",
                        )}
                        <br />
                        {t("Razem? Idealnie", "Together? Perfect")}
                      </h2>
                      <p>
                        {t(
                          "Mieszaj kuchnie, jak lubisz. Jedno zamówienie, więcej przyjemności.",
                          "Mix your favourite kitchens. One checkout, more happy moments.",
                        )}
                      </p>
                    </div>
                    <button
                      className="round-arrow"
                      onClick={() => setTour(1)}
                      aria-label={t(
                        "Jak zamawiać z kilku restauracji",
                        "How to order from multiple restaurants",
                      )}
                    >
                      <ArrowUpRight size={27} />
                    </button>
                  </section>
                  <section className="section cravings">
                    <div className="section-heading">
                      <div>
                        <p className="eyebrow">
                          {t("MIŁOŚĆ OD PIERWSZEGO KĘSA", "LOVE AT FIRST BITE")}
                        </p>
                        <h2>
                          {t("Małe", "Little")}{" "}
                          <em>{t("zachcianki", "cravings")}</em>
                        </h2>
                      </div>
                      <span className="handwritten">
                        {t(
                          "zawsze jest miejsce na coś dobrego",
                          "there’s always room for something good",
                        )}{" "}
                        ↘
                      </span>
                    </div>
                    <div className="dish-grid">
                      {[menu[0], menu[2], menu[4], menu[8]].map((item) => (
                        <article className="dish-card" key={item.id}>
                          <button
                            className="dish-photo"
                            onClick={() => chooseDish(item)}
                          >
                            <FoodImage
                              src={item.image}
                              alt={pl ? item.name : item.nameEn}
                            />
                            {item.vegetarian && (
                              <span className="vege-badge">
                                <Leaf size={14} />
                              </span>
                            )}
                          </button>
                          <span className="eyebrow">
                            {restaurantFor(item.restaurantId).name}
                          </span>
                          <button
                            className="dish-title"
                            onClick={() => chooseDish(item)}
                          >
                            {pl ? item.name : item.nameEn}
                          </button>
                          <div>
                            <strong>{price(item.price, locale)}</strong>
                            <button
                              className={`add-button ${lastAdded?.item.id === item.id ? "just-added" : ""}`}
                              onClick={() => add(item)}
                              aria-label={`${t("Dodaj", "Add")} ${item.name}`}
                            >
                              {lastAdded?.item.id === item.id ? (
                                <Check size={19} />
                              ) : (
                                <Plus size={19} />
                              )}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                  <section className="hall-banner">
                    <img
                      src="/assets/hall.jpg"
                      alt="Hala Koszyki, Warszawa"
                      loading="lazy"
                    />
                    <div>
                      <p className="eyebrow">KOSZYKOWA 63 · WARSZAWA</p>
                      <h2>
                        {t("Jedna hala", "One hall")}
                        <br />
                        {t("Cały świat smaków", "A world of flavours")}
                      </h2>
                      <button
                        className="cream-button"
                        onClick={() => navigate("map")}
                      >
                        {t("Rozejrzyj się", "Take a look around")}
                        <ArrowUpRight size={18} />
                      </button>
                    </div>
                    <span className="hall-seal">
                      HALA
                      <br />
                      <b>KOSZYKI</b>
                      <br />
                      OD 1909
                    </span>
                  </section>
                </motion.div>
              )}
              {tab === "map" && (
                <div className="section page-section">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">HALA KOSZYKI · WARSZAWA</p>
                      <h1 className="page-title">
                        {t("Podążaj za", "Follow the")}{" "}
                        <em>{t("apetytem", "good food")}</em>
                      </h1>
                    </div>
                    <span className="pill">
                      <MapPin size={16} />
                      {t("Stolik", "Table")} {table}
                    </span>
                  </div>
                  <HallMap
                    locale={locale}
                    table={table}
                    selected={mapSelection}
                    onSelect={setMapSelection}
                    onMenu={(id) => setRestaurant(restaurantFor(id))}
                  />
                </div>
              )}
              {tab === "orders" && (
                <div className="section page-section orders-page">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">
                        {t(
                          "TY ODPOCZYWASZ · MY CZARUJEMY",
                          "YOU RELAX · WE’RE ON IT",
                        )}
                      </p>
                      <h1 className="page-title">
                        {t("Twoje", "Your")} <em>{t("papu", "happy food")}</em>
                      </h1>
                    </div>
                    <span className="pill">
                      <span className="green-dot" />
                      {t("Stolik", "Table")} {table}
                    </span>
                  </div>
                  {!orders.length ? (
                    <div className="empty-state large">
                      <Papaya className="empty-papaya" />
                      <h2>
                        {t(
                          "Tu zaczyna się coś pysznego",
                          "Something delicious starts here",
                        )}
                      </h2>
                      <p>
                        {t(
                          "Twoje zamówienia pojawią się tutaj. Najpierw znajdź swój ulubiony smak.",
                          "Your orders will appear here. First, find a flavour you love.",
                        )}
                      </p>
                      <button className="primary" onClick={browse}>
                        {t("Odkryj restauracje", "Explore restaurants")}
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="order-notice">
                        <ChefHat size={20} />
                        <span>
                          {t(
                            "Chwila dla Ciebie. Demo kuchni trwa 12–28 sekund.",
                            "A moment for you. Demo kitchens take 12–28 seconds.",
                          )}
                        </span>
                        <span className="demo-label">DEMO</span>
                      </div>
                      <div className="orders-grid">
                        {orders.map((order) => (
                          <OrderTicket
                            key={order.id}
                            order={order}
                            locale={locale}
                            now={now}
                            onPickup={() => {
                              setMapSelection(order.restaurantId);
                              navigate("map");
                            }}
                            onCollect={() =>
                              setStore((s) => ({
                                ...s,
                                orders: s.orders.map((o) =>
                                  o.id === order.id
                                    ? { ...o, collected: true }
                                    : o,
                                ),
                              }))
                            }
                            onReady={() =>
                              setStore((s) => ({
                                ...s,
                                orders: s.orders.map((o) =>
                                  o.id === order.id
                                    ? { ...o, readyAt: Date.now() }
                                    : o,
                                ),
                              }))
                            }
                            onReorder={() => {
                              setStore((s) => ({
                                ...s,
                                cart: order.lines.reduce(
                                  (lines, line) =>
                                    addLine(
                                      lines,
                                      line.itemId,
                                      line.quantity,
                                      line.extra,
                                      line.note,
                                    ),
                                  s.cart,
                                ),
                              }));
                              setCheckout(false);
                              setCartOpen(true);
                            }}
                          />
                        ))}
                      </div>
                      <p className="fine-print center">
                        {t(
                          "To demonstracja. Statusy zmieniają się automatycznie, płatności są symulowane.",
                          "This is a demo. Statuses advance automatically and payments are simulated.",
                        )}
                      </p>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
        <footer>
          <Brand />
          <span>
            {t(
              "Dobry smak zaczyna się od papu.",
              "Good taste starts with papu.",
            )}
          </span>
          <div>
            <button onClick={() => setTour(0)}>
              {t("Jak to działa", "How it works")}
            </button>
            <button onClick={() => setInfo(true)}>
              {t("O wersji demo", "About this demo")}
            </button>
            <span>© 2026 PapuPay</span>
          </div>
        </footer>
        <nav
          className="mobile-nav"
          aria-label={t("Nawigacja mobilna", "Mobile navigation")}
        >
          {navItems.map(({ id, Icon, label }) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => navigate(id)}
            >
              <Icon size={21} />
              <span>{label}</span>
              {id === "orders" && activeOrders.length > 0 && (
                <i>{activeOrders.length}</i>
              )}
            </button>
          ))}
        </nav>
        <AnimatePresence>
          {count > 0 && !cartOpen && !dish && (
            <motion.button
              className="floating-cart"
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => {
                setCheckout(false);
                setCartOpen(true);
              }}
            >
              <span className="cart-count">{count}</span>
              <span>
                {t("Zobacz koszyk", "View basket")}
                <small>
                  {t("Kuchnie", "Kitchens")}: {groupCart(cart).length} ·{" "}
                  {t("jedno zamówienie", "one checkout")}
                </small>
              </span>
              <strong>{price(total, locale)}</strong>
              <ArrowRight size={20} />
            </motion.button>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {lastAdded && !restaurant && !dish && !cartOpen && !success && (
            <div className="page-basket-feedback">{addedNotice()}</div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {toast && (
            <motion.div
              className="toast"
              role="status"
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <span>
                <Check size={16} />
              </span>
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
        {storageError && (
          <div role="status" className="storage-notice">
            {t(
              "Pamięć przeglądarki jest niedostępna. Demo działa do zamknięcia tej karty.",
              "Browser storage is unavailable. This demo lasts until the tab closes.",
            )}
          </div>
        )}
        {restaurant && !dish && (
          <Modal
            wide
            label={`${restaurant.name} menu`}
            onClose={() => setRestaurant(null)}
          >
            <div className="restaurant-modal-hero">
              <FoodImage src={restaurant.image} alt={restaurant.cuisine} />
              <div className="restaurant-modal-title">
                <span className="pill cream">
                  <MapPin size={14} />
                  {t("Lokal", "Unit")} {restaurant.unit}
                </span>
                <h2>{restaurant.name}</h2>
                <span>
                  {pl ? restaurant.cuisine : restaurant.cuisineEn} <i>·</i>{" "}
                  {t("Demo · 12–28 s", "Demo · 12–28 sec")}
                </span>
              </div>
            </div>
            <div className="modal-content">
              <div className="restaurant-intro">
                <p>{pl ? restaurant.description : restaurant.descriptionEn}</p>
                <button
                  className="icon-button"
                  aria-label={t("Pokaż na mapie", "Show on map")}
                  onClick={() => {
                    setMapSelection(restaurant.id);
                    setRestaurant(null);
                    navigate("map");
                  }}
                >
                  <Map size={21} />
                </button>
              </div>
              <div className="menu-heading">
                <h3>{t("Dobre rzeczy w menu", "Good things on the menu")}</h3>
                <span className="demo-label">
                  {t("Menu pokazowe", "Demo menu")}
                </span>
              </div>
              <div className="menu-list">
                {menu
                  .filter((i) => i.restaurantId === restaurant.id)
                  .map((item) => (
                    <article key={item.id}>
                      <button
                        className="menu-item-copy"
                        onClick={() => chooseDish(item)}
                      >
                        <span className="dish-tag">
                          {item.vegetarian ? (
                            <Leaf size={12} />
                          ) : (
                            <Sparkles size={12} />
                          )}{" "}
                          {item.tag}
                        </span>
                        <h3>{pl ? item.name : item.nameEn}</h3>
                        <p>{pl ? item.description : item.descriptionEn}</p>
                        <strong>{price(item.price, locale)}</strong>
                      </button>
                      <div className="menu-item-image">
                        <button
                          onClick={() => chooseDish(item)}
                          aria-label={item.name}
                        >
                          <FoodImage src={item.image} alt={item.name} />
                        </button>
                        <button
                          className="add-button"
                          aria-label={`${t("Dostosuj", "Customize")} ${item.name}`}
                          onClick={() => chooseDish(item)}
                        >
                          <Plus size={21} />
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
              <p className="fine-print">
                {t(
                  "Dania, ceny, alergeny i czasy są przykładowe. Zdjęcia mają charakter poglądowy.",
                  "Dishes, prices, allergens and prep times are samples. Photos are illustrative.",
                )}
              </p>
              <a
                className="text-button official-link"
                href={restaurant.source}
                target="_blank"
                rel="noreferrer"
              >
                {t("O restauracji na koszyki.com", "Restaurant on koszyki.com")}
                <ArrowUpRight size={15} />
              </a>
            </div>
            {count > 0 && (
              <div className="restaurant-basket-rail">
                <AnimatePresence>{addedNotice()}</AnimatePresence>
                {!lastAdded && (
                  <button className="menu-basket-cta" onClick={openBasket}>
                    <ShoppingBag size={19} />
                    <span>
                      {t("Zobacz koszyk", "View basket")}{" "}
                      <small>
                        {count} {t("w koszyku", "in your basket")}
                      </small>
                    </span>
                    <strong>{price(total, locale)}</strong>
                    <ArrowRight size={18} />
                  </button>
                )}
              </div>
            )}
          </Modal>
        )}
        {dish && (
          <Modal label={dish.name} onClose={() => setDish(null)}>
            <div className="dish-modal-image">
              <FoodImage src={dish.image} alt={dish.name} />
              <span className="pill cream">
                {restaurantFor(dish.restaurantId).name}
              </span>
            </div>
            <div className="modal-content">
              <div className="dish-modal-heading">
                <h2>{pl ? dish.name : dish.nameEn}</h2>
                <strong>{price(dish.price, locale)}</strong>
              </div>
              <p className="muted">
                {pl ? dish.description : dish.descriptionEn}
              </p>
              <div className="allergen-list">
                {dish.vegetarian && (
                  <span>
                    <Leaf size={13} />
                    Vege
                  </span>
                )}
                {dish.allergens.map((a) => (
                  <span key={a}>
                    {pl
                      ? (
                          {
                            gluten: "Gluten",
                            milk: "Mleko",
                            egg: "Jaja",
                            mustard: "Gorczyca",
                            soy: "Soja",
                            sesame: "Sezam",
                            nuts: "Orzechy",
                            peanuts: "Orzeszki ziemne",
                            fish: "Ryby",
                          } as Record<string, string>
                        )[a]
                      : a}
                  </span>
                ))}
              </div>
              <div className="option-section">
                <h3>
                  {t(
                    "Jeszcze trochę przyjemności?",
                    "A little extra happiness?",
                  )}
                </h3>
                <label className="extra-option">
                  <span>
                    <strong>{t("Dodatkowy sos", "Extra sauce")}</strong>
                    <small>
                      {t(
                        "Dobierz sos szefa kuchni",
                        "Add the chef’s signature sauce",
                      )}
                    </small>
                  </span>
                  <b>+ {price(500, locale)}</b>
                  <input
                    type="checkbox"
                    checked={extra}
                    onChange={(e) => setExtra(e.target.checked)}
                  />
                </label>
              </div>
              <label className="note-label">
                {t("Coś dla kuchni?", "A note for the kitchen?")}
                <span>{t("opcjonalnie", "optional")}</span>
                <textarea
                  maxLength={180}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("Np. bez cebuli…", "For example, no onions…")}
                />
              </label>
              <p className="fine-print">
                {t(
                  "Informacje o alergenach są przykładowe. W realnym zamówieniu potwierdź je z restauracją.",
                  "Allergen information is illustrative. Confirm it with the restaurant for a real order.",
                )}
              </p>
              <div className="dish-modal-footer">
                <div className="stepper">
                  <button
                    aria-label={t("Zmniejsz ilość", "Decrease quantity")}
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(quantity - 1)}
                  >
                    <Minus size={17} />
                  </button>
                  <strong>{quantity}</strong>
                  <button
                    aria-label={t("Zwiększ ilość", "Increase quantity")}
                    disabled={quantity >= 20}
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus size={17} />
                  </button>
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    add(dish, quantity, extra, note);
                    setDish(null);
                  }}
                >
                  {t("Dodaj", "Add to basket")}
                  <span>
                    {price((dish.price + (extra ? 500 : 0)) * quantity, locale)}
                  </span>
                </button>
              </div>
            </div>
          </Modal>
        )}
        {cartOpen && (
          <Modal
            label={
              checkout
                ? t("Podsumowanie", "Checkout")
                : t("Twój koszyk", "Your basket")
            }
            onClose={() => {
              if (!paying) setCartOpen(false);
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={checkout ? "checkout" : "basket"}
                className="modal-content basket-content"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
              >
                <div className="eyebrow">
                  {t(
                    "JEDEN KOSZYK · DUŻO SZCZĘŚCIA",
                    "ONE BASKET · LOTS OF HAPPINESS",
                  )}
                </div>
                <h2>
                  {checkout
                    ? t("Prawie przy stole", "Almost at the table")
                    : t("Same dobre rzeczy", "All the good stuff")}
                </h2>
                <div className="basket-context">
                  <MapPin size={16} /> Hala Koszyki <span>·</span>{" "}
                  {t("Stolik", "Table")} {table}
                </div>
                {!cart.length ? (
                  <div className="empty-state">
                    <Papaya className="empty-papaya" />
                    <h3>
                      {t(
                        "Apetyt jest, papu jeszcze nie",
                        "Appetite? Yes. Food? Not yet",
                      )}
                    </h3>
                    <p>
                      {t(
                        "Dodaj coś pysznego z dowolnej restauracji.",
                        "Add something delicious from any restaurant.",
                      )}
                    </p>
                    <button
                      className="primary"
                      onClick={() => {
                        setCartOpen(false);
                        browse();
                      }}
                    >
                      {t("Znajdź swój smak", "Find your flavour")}
                      <ArrowRight size={17} />
                    </button>
                  </div>
                ) : (
                  <>
                    {!checkout &&
                      groupCart(cart).map(({ restaurant: r, lines }) => (
                        <section className="basket-group" key={r.id}>
                          <h3>
                            <span style={{ background: r.color }}>
                              {r.name.slice(0, 1)}
                            </span>
                            {r.name}
                            <small>
                              {t("Lokal", "Unit")} {r.unit}
                            </small>
                          </h3>
                          {lines.map((line) => (
                            <div className="basket-item" key={line.id}>
                              <FoodImage
                                src={dishFor(line.itemId).image}
                                alt=""
                              />
                              <div>
                                <strong>
                                  {pl
                                    ? dishFor(line.itemId).name
                                    : dishFor(line.itemId).nameEn}
                                </strong>
                                {line.extra && (
                                  <small>
                                    + {t("Dodatkowy sos", "Extra sauce")}
                                  </small>
                                )}
                                {line.note && (
                                  <small className="line-note">
                                    {line.note}
                                  </small>
                                )}
                                <div className="basket-item-bottom">
                                  <div className="stepper small">
                                    <button
                                      disabled={paying}
                                      aria-label={`${t("Zmniejsz", "Decrease")} ${dishFor(line.itemId).name}`}
                                      onClick={() =>
                                        updateQuantity(line.id, -1)
                                      }
                                    >
                                      <Minus size={13} />
                                    </button>
                                    <b>{line.quantity}</b>
                                    <button
                                      disabled={paying || line.quantity >= 20}
                                      aria-label={`${t("Zwiększ", "Increase")} ${dishFor(line.itemId).name}`}
                                      onClick={() => updateQuantity(line.id, 1)}
                                    >
                                      <Plus size={13} />
                                    </button>
                                  </div>
                                  <strong>
                                    {price(linePrice(line), locale)}
                                  </strong>
                                </div>
                              </div>
                            </div>
                          ))}
                        </section>
                      ))}
                    {!checkout &&
                      !cart.some((x) => x.itemId === "bar-lemonade") && (
                        <button
                          className="upsell"
                          onClick={() =>
                            add(menu.find((x) => x.id === "bar-lemonade")!)
                          }
                        >
                          <FoodImage src="lemonade.jpg" alt="" />
                          <span>
                            <strong>
                              {t(
                                "A do tego coś orzeźwiającego?",
                                "Something refreshing with that?",
                              )}
                            </strong>
                            <small>
                              {t("Lemoniada yuzu", "Yuzu lemonade")} ·{" "}
                              {price(1800, locale)}
                            </small>
                          </span>
                          <Plus size={20} />
                        </button>
                      )}
                    {checkout && (
                      <>
                        <div className="checkout-ready">
                          <ShoppingBag size={26} />
                          <div>
                            <h3>
                              {t(
                                "Twój koszyk jest gotowy",
                                "Your basket is ready",
                              )}
                            </h3>
                            <p>
                              {t("Produkty", "Items")}: {count} ·{" "}
                              {t("Kuchnie", "Kitchens")}:{" "}
                              {groupCart(cart).length}
                            </p>
                          </div>
                        </div>
                        <div className="notification-choice">
                          <div>
                            <strong>
                              {t(
                                "Daj znać, gdy gotowe",
                                "Tell me when it’s ready",
                              )}
                            </strong>
                            <p>
                              {alertMessage ||
                                t(
                                  "Demo: 12–28 sekund. Zostaw tę kartę otwartą.",
                                  "Demo: 12–28 seconds. Keep this tab open.",
                                )}
                            </p>
                          </div>
                          <button onClick={enableAlerts} type="button">
                            {t("Włącz alert", "Enable alert")}
                          </button>
                        </div>
                        <label className="checkout-name">
                          {t("Jak mamy Cię wołać?", "What should we call you?")}
                          <input
                            maxLength={40}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t(
                              "Twoje imię (opcjonalnie)",
                              "Your name (optional)",
                            )}
                            disabled={paying}
                          />
                        </label>
                        <div className="payment-explanation">
                          <LockKeyhole size={20} />
                          <span>
                            <strong>
                              {t("Płatność demonstracyjna", "Demo payment")}
                            </strong>
                            <small>
                              {t(
                                "Bez karty, bez obciążenia konta. Po prostu wypróbuj.",
                                "No card, no charge. Just try the experience.",
                              )}
                            </small>
                          </span>
                        </div>
                      </>
                    )}
                    <div className="basket-summary">
                      <p>
                        <span>
                          {t("Produkty", "Items")} ({count})
                        </span>
                        <span>{price(total, locale)}</span>
                      </p>
                      <p>
                        <span>{t("Opłata serwisowa", "Service fee")}</span>
                        <span>{price(0, locale)}</span>
                      </p>
                      <div>
                        <h3>{t("Razem", "Total")}</h3>
                        <strong>{price(total, locale)}</strong>
                      </div>
                    </div>
                    <button
                      className="primary full-width checkout-cta"
                      disabled={paying}
                      onClick={checkout ? pay : () => setCheckout(true)}
                    >
                      {paying ? (
                        <>
                          <span className="spinner" />
                          {t(
                            "Papu w drodze do kuchni…",
                            "Sending your happy food…",
                          )}
                        </>
                      ) : (
                        <>
                          {checkout
                            ? t("Zamawiam w demo", "Place demo order")
                            : t(
                                "Przejdź do podsumowania",
                                "Continue to checkout",
                              )}
                          <ArrowRight size={20} />
                        </>
                      )}
                    </button>
                    {checkout && (
                      <button
                        disabled={paying}
                        className="text-button back-to-cart"
                        onClick={() => setCheckout(false)}
                      >
                        <ArrowLeft size={15} />
                        {t("Wróć do koszyka", "Back to basket")}
                      </button>
                    )}
                    <p className="fine-print center">
                      {t(
                        "Odbiór osobisty przy stanowiskach restauracji.",
                        "Collect your food at each restaurant’s counter.",
                      )}
                    </p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
            <AnimatePresence>
              {lastAdded && (
                <div className="basket-inline-feedback">
                  {addedNotice(true)}
                </div>
              )}
            </AnimatePresence>
          </Modal>
        )}
        {success && (
          <Modal
            label={t("Zamówienie przyjęte", "Order received")}
            onClose={() => setSuccess(false)}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={String(confirmationReady)}
                className="success-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <div className="success-motion">
                  <Suspense fallback={<Papaya />}>
                    <PapuMotion scene={confirmationReady ? 4 : 3} />
                  </Suspense>
                  <div className="confetti">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
                <p className="eyebrow">
                  {t(
                    "I JUŻ · TERAZ CHWILA DLA CIEBIE",
                    "THAT’S IT · NOW TAKE A MOMENT",
                  )}
                </p>
                <h2>
                  {confirmationReady
                    ? t("Pora na papu!", "Your papu is ready!")
                    : t("Już się robi", "On its way")}
                </h2>
                <p>
                  {confirmationReady
                    ? t(
                        "Twoje smaki czekają. Zobacz numery odbioru i drogę do kuchni.",
                        "Your food is waiting. See your pickup numbers and the way to each kitchen.",
                      )
                    : t(
                        "Rozgość się przy stoliku. Twoje smaki są już w dobrych rękach.",
                        "Settle in at your table. Your cravings are in good hands.",
                      )}
                </p>
                <div className="success-table">
                  <MapPin size={19} />
                  {t("Stolik", "Table")} {table}
                  <span>Hala Koszyki</span>
                </div>
                <button
                  className="primary full-width"
                  onClick={() => setSuccess(false)}
                >
                  {confirmationReady
                    ? t("Zobacz odbiór", "See pickup")
                    : t("Śledź moje papu", "Track my food")}
                  <ArrowRight size={18} />
                </button>
                <p className="fine-print">
                  {t(
                    "Zamówienie demo — bez płatności i wysyłki do restauracji.",
                    "Demo order — no payment or submission to restaurants.",
                  )}
                </p>
              </motion.div>
            </AnimatePresence>
          </Modal>
        )}
        {tour !== null && (
          <Modal
            label={t("Jak działa PapuPay", "How PapuPay works")}
            onClose={() => setTour(null)}
          >
            <div className="tour-content">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tour}
                  className="tour-step"
                  initial={{ opacity: 0, x: 22 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -22 }}
                  transition={{ duration: 0.22 }}
                >
                  <div className={`tour-visual tour-${tour}`}>
                    <Suspense fallback={<Papaya />}>
                      <PapuMotion scene={[1, 2, 4][tour]} />
                    </Suspense>
                  </div>
                  <div className="tour-dots">
                    {[0, 1, 2].map((i) => (
                      <button
                        key={i}
                        aria-label={`${t("Krok", "Step")} ${i + 1}`}
                        aria-current={tour === i ? "step" : undefined}
                        className={i === tour ? "active" : ""}
                        onClick={() => setTour(i)}
                      />
                    ))}
                  </div>
                  <p className="eyebrow">
                    {t("MAŁY SKAN · WIELKIE MNIAM", "LITTLE SCAN · BIG YUM")}
                  </p>
                  <h2>
                    {
                      [
                        t("Usiądź i zeskanuj", "Sit down and scan"),
                        t(
                          "Każdy znajdzie swój smak",
                          "Every craving gets a seat",
                        ),
                        t("Odbierz i ciesz się chwilą", "Pick up and dig in"),
                      ][tour]
                    }
                  </h2>
                  <p>
                    {
                      [
                        t(
                          `Kod QR zna Twój stolik. Jesteś przy numerze ${table}. Bez konta. Od razu do jedzenia.`,
                          `The QR knows your table. You’re at number ${table}. No account. Straight to the good stuff.`,
                        ),
                        t(
                          "Ramen z KAGO, burger z ATOM, lemoniada z baru. Wszystko w jednym koszyku, z jednym podsumowaniem.",
                          "Ramen from KAGO, a burger from ATOM, a lemonade from the bar. All in one basket, one checkout.",
                        ),
                        t(
                          "Obserwuj postęp zamówienia. Gdy kuchnia da znak, mapa poprowadzi Cię do odpowiedniego stanowiska.",
                          "Follow your order’s progress. When a kitchen is ready, the map shows you the right counter.",
                        ),
                      ][tour]
                    }
                  </p>
                </motion.div>
              </AnimatePresence>
              <button
                className="primary full-width"
                onClick={() => {
                  if (tour < 2) setTour(tour + 1);
                  else {
                    setTour(null);
                    browse();
                  }
                }}
              >
                {tour === 2
                  ? t("Mam apetyt. Zaczynamy!", "I’m hungry. Let’s go!")
                  : t("Dalej", "Next")}
                <ArrowRight size={18} />
              </button>
              <button className="text-button" onClick={() => setTour(null)}>
                {t("Już wiem, pomiń", "I’ve got it, skip")}
              </button>
            </div>
          </Modal>
        )}
        {tableDialog && (
          <Modal
            label={t("Twój stolik", "Your table")}
            onClose={() => setTableDialog(false)}
          >
            <div className="modal-content table-content">
              <span className="table-qr-icon">
                <QrCode size={40} />
              </span>
              <p className="eyebrow">HALA KOSZYKI</p>
              <h2>{t("Dobrze Cię tu widzieć", "Good to have you here")}</h2>
              <p>
                {t(
                  "Numer stolika przychodzi z kodu QR. W demo możesz go zmienić.",
                  "Your table number comes from the QR. You can change it in this demo.",
                )}
              </p>
              <label>
                {t("Numer stolika", "Table number")}
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={tableInput}
                  onChange={(e) => {
                    setTableInput(e.target.value);
                    setTableError("");
                  }}
                />
              </label>
              {tableError && (
                <p role="alert" className="form-error">
                  {tableError}
                </p>
              )}
              <button
                className="primary full-width"
                onClick={() => {
                  if (!/^\d{1,3}$/.test(tableInput) || Number(tableInput) < 1) {
                    setTableError(
                      t(
                        "Wybierz numer od 1 do 999.",
                        "Choose a number from 1 to 999.",
                      ),
                    );
                    return;
                  }
                  const value = String(Number(tableInput));
                  setTable(value);
                  const url = new URL(location.href);
                  url.pathname = qrPath(value, context.venueId);
                  url.searchParams.delete("table");
                  url.searchParams.delete("venue");
                  history.replaceState({}, "", url);
                  setTableDialog(false);
                  notify(
                    t(
                      `Jesteś przy stoliku ${value}.`,
                      `You’re at table ${value}.`,
                    ),
                  );
                }}
              >
                {t("To mój stolik", "That’s my table")}
                <Check size={18} />
              </button>
            </div>
          </Modal>
        )}
        {info && (
          <Modal
            label={t("O wersji demo", "About this demo")}
            onClose={() => setInfo(false)}
          >
            <div className="modal-content info-content">
              <Brand />
              <h2>
                {t(
                  "Mała próbka dużego pomysłu",
                  "A little taste of a big idea",
                )}
              </h2>
              <p>
                {t(
                  "PapuPay to koncepcja zamawiania jedzenia z różnych restauracji w hali. Ta wersja pokazuje pełną podróż od skanu QR do odbioru.",
                  "PapuPay brings different food hall restaurants into one ordering experience. This demo covers the journey from QR scan to pickup.",
                )}
              </p>
              <p>
                {t(
                  "Restauracje i numery lokali pochodzą z oficjalnej strony Hali Koszyki. Przykładowe menu, ceny, alergeny, zdjęcia potraw i czasy nie stanowią oferty restauracji. Projekt nie jest powiązany z Halą Koszyki.",
                  "Restaurant identities and unit numbers come from Hala Koszyki’s official site. Sample menus, prices, allergens, dish photos and times are not restaurant offers. This project is not affiliated with Hala Koszyki.",
                )}
              </p>
              <p>
                {t(
                  "Koszyk i zamówienia są przechowywane tylko w tej przeglądarce. Żadna płatność ani zamówienie nie trafia do restauracji.",
                  "Your basket and orders are stored only in this browser. No payment or order is sent to a restaurant.",
                )}
              </p>
              <a
                className="text-button"
                href="https://koszyki.com/uslugi/restauracje/"
                target="_blank"
                rel="noreferrer"
              >
                koszyki.com
                <ArrowUpRight size={16} />
              </a>
              <button
                className="secondary full-width"
                onClick={() => {
                  setInfo(false);
                  setKitchen(true);
                }}
              >
                <ChefHat size={18} />
                {t("Otwórz demo kuchni", "Open kitchen demo")}
              </button>
              <button
                className="text-button"
                onClick={() => {
                  setStore((s) => ({ ...s, orders: [] }));
                  notify(
                    t("Historia demo wyczyszczona.", "Demo history cleared."),
                  );
                }}
              >
                {t("Wyczyść historię demo", "Clear demo history")}
              </button>
            </div>
          </Modal>
        )}
        {kitchen && (
          <Modal
            wide
            label={t("Demo kuchni", "Kitchen demo")}
            onClose={() => setKitchen(false)}
          >
            <div className="modal-content kitchen-content">
              <p className="eyebrow">PAPUPAY · KITCHEN DEMO</p>
              <h2>
                {t("Dobre rzeczy się dzieją", "Good things are happening")}
              </h2>
              <p className="muted">
                {t(
                  "Ten sam stan zamówień, widok dla kuchni. Otwórz drugą kartę, by pokazać aktualizację na żywo.",
                  "The same orders, from the kitchen’s view. Open a second tab to show live updates.",
                )}
              </p>
              {!activeOrders.length ? (
                <p>{t("Brak aktywnych zamówień.", "No active orders.")}</p>
              ) : (
                activeOrders.map((o) => (
                  <div className="kitchen-ticket" key={o.id}>
                    <div>
                      <strong>
                        {restaurantFor(o.restaurantId).name} · #{o.id}
                      </strong>
                      <p>
                        {o.name} · {t("Stolik", "Table")} {o.table}
                      </p>
                      <small>
                        {o.lines
                          .map(
                            (l) =>
                              `${l.quantity} × ${dishFor(l.itemId).name}${l.note ? ` (${l.note})` : ""}`,
                          )
                          .join(", ")}
                      </small>
                    </div>
                    <button
                      className="primary"
                      disabled={statusFor(o, now) === "ready"}
                      onClick={() =>
                        setStore((s) => ({
                          ...s,
                          orders: s.orders.map((x) =>
                            x.id === o.id ? { ...x, readyAt: Date.now() } : x,
                          ),
                        }))
                      }
                    >
                      {statusFor(o, now) === "ready"
                        ? t("Gotowe", "Ready")
                        : t("Oznacz gotowe", "Mark ready")}
                      <Check size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </Modal>
        )}
      </div>
    </MotionConfig>
  );
}
