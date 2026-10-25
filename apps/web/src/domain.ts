import catalog from "../../../packages/catalog/catalog.json";
export const restaurants = catalog.restaurants;
export const menu = catalog.items;
export type Restaurant = (typeof restaurants)[number];
export type Dish = (typeof menu)[number];
export type Locale = "pl" | "en";
export type CartLine = {
  id: string;
  itemId: string;
  quantity: number;
  note: string;
  extra: boolean;
};
export type Order = {
  venueId: "koszyki";
  id: string;
  restaurantId: string;
  table: string;
  name: string;
  lines: CartLine[];
  total: number;
  createdAt: number;
  readyAt: number;
  collected: boolean;
};
export type Store = {
  version: 1;
  cart: CartLine[];
  orders: Order[];
  locale: Locale;
};
export const initialStore: Store = {
  version: 1,
  cart: [],
  orders: [],
  locale: "pl",
};
const priceFormatters = Object.fromEntries(
  ["pl", "en"].flatMap((locale) =>
    [0, 2].map((digits) => [
      `${locale}-${digits}`,
      new Intl.NumberFormat(locale === "pl" ? "pl-PL" : "en-GB", {
        style: "currency",
        currency: "PLN",
        maximumFractionDigits: digits,
      }),
    ]),
  ),
);
export const price = (cents: number, locale: Locale = "pl") =>
  priceFormatters[`${locale}-${cents % 100 === 0 ? 0 : 2}`].format(cents / 100);
export const dishFor = (id: string) => menu.find((x) => x.id === id)!;
export const restaurantFor = (id: string) =>
  restaurants.find((x) => x.id === id)!;
export const linePrice = (line: CartLine) =>
  (dishFor(line.itemId).price + (line.extra ? 500 : 0)) * line.quantity;
export const cartTotal = (lines: CartLine[]) =>
  lines.reduce((sum, x) => sum + linePrice(x), 0);
export const lineKey = (itemId: string, extra: boolean, note: string) =>
  `${itemId}|${extra}|${note.trim().slice(0, 180)}`;
export function addLine(
  lines: CartLine[],
  itemId: string,
  quantity = 1,
  extra = false,
  note = "",
): CartLine[] {
  const id = lineKey(itemId, extra, note),
    exists = lines.find((x) => x.id === id);
  if (
    !menu.some((x) => x.id === itemId) ||
    !Number.isInteger(quantity) ||
    quantity < 1
  )
    return lines;
  return exists
    ? lines.map((x) =>
        x.id === id
          ? { ...x, quantity: Math.min(20, x.quantity + quantity) }
          : x,
      )
    : [
        ...lines,
        {
          id,
          itemId,
          quantity: Math.min(20, quantity),
          extra,
          note: note.trim().slice(0, 180),
        },
      ];
}
export function groupCart(lines: CartLine[]) {
  return restaurants
    .map((restaurant) => ({
      restaurant,
      lines: lines.filter(
        (x) => dishFor(x.itemId).restaurantId === restaurant.id,
      ),
    }))
    .filter((x) => x.lines.length > 0);
}
export function tableFromURL(search: string) {
  const value = new URLSearchParams(search).get("table");
  return value &&
    /^\d{1,3}$/.test(value) &&
    Number(value) > 0 &&
    Number(value) <= 999
    ? String(Number(value))
    : "24";
}
export function statusFor(
  order: Order,
  now = Date.now(),
): "received" | "preparing" | "ready" | "collected" {
  return order.collected
    ? "collected"
    : now >= order.readyAt
      ? "ready"
      : now - order.createdAt > 3000
        ? "preparing"
        : "received";
}
export function createOrders(
  lines: CartLine[],
  table: string,
  name: string,
  now = Date.now(),
): Order[] {
  return groupCart(lines).map(({ restaurant, lines }, i) => ({
    id: `P${now.toString(36).slice(-4).toUpperCase()}${i + 1}`,
    restaurantId: restaurant.id,
    venueId: "koszyki",
    table,
    name: name.trim() || "Gość",
    lines: structuredClone(lines),
    total: cartTotal(lines),
    createdAt: now,
    readyAt: now + 12000 + i * 2000,
    collected: false,
  }));
}
export function readStore(raw: string | null): Store {
  try {
    if (!raw) return initialStore;
    const value = JSON.parse(raw);
    if (value.version !== 1) return initialStore;
    const validLine = (x: unknown): x is CartLine => {
      if (!x || typeof x !== "object") return false;
      const l = x as CartLine;
      return (
        typeof l.id === "string" &&
        menu.some((m) => m.id === l.itemId) &&
        Number.isInteger(l.quantity) &&
        l.quantity > 0 &&
        l.quantity <= 20 &&
        typeof l.note === "string" &&
        l.note.length <= 180 &&
        l.id === lineKey(l.itemId, l.extra, l.note) &&
        typeof l.extra === "boolean"
      );
    };
    return {
      version: 1,
      locale: value.locale === "en" ? "en" : "pl",
      cart: Array.isArray(value.cart) ? value.cart.filter(validLine) : [],
      orders: Array.isArray(value.orders)
        ? value.orders
            .map((o: Order | null) =>
              o == null ? o : { ...o, venueId: o.venueId ?? "koszyki" },
            )
            .filter(
              (o: Order) =>
                o != null &&
                o.venueId === "koszyki" &&
                typeof o.id === "string" &&
                restaurants.some((r) => r.id === o.restaurantId) &&
                Array.isArray(o.lines) &&
                o.lines.length > 0 &&
                o.lines.every(validLine) &&
                o.lines.every(
                  (l) => dishFor(l.itemId).restaurantId === o.restaurantId,
                ) &&
                o.total === cartTotal(o.lines) &&
                Number.isFinite(o.readyAt) &&
                Number.isFinite(o.createdAt) &&
                typeof o.collected === "boolean" &&
                typeof o.name === "string" &&
                typeof o.table === "string" &&
                Number.isFinite(o.total),
            )
        : [],
    };
  } catch {
    return initialStore;
  }
}
