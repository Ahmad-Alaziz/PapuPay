import { describe, it, expect } from "vitest";
import {
  addLine,
  cartTotal,
  groupCart,
  createOrders,
  readStore,
  tableFromURL,
  statusFor,
  menu,
  restaurants,
  initialStore,
} from "./domain";
const first = menu[0];
const other = menu.find((item) => item.restaurantId !== first.restaurantId)!;
describe("multi-kitchen ordering", () => {
  it("keeps customizations separate and computes exact integer-cent totals", () => {
    const plain = addLine([], first.id, 2);
    const sauce = addLine(plain, first.id, 1, true, " Bez cebuli ");
    const mixed = addLine(sauce, other.id);
    expect(mixed).toHaveLength(3);
    expect(mixed[1].note).toBe("Bez cebuli");
    expect(cartTotal(mixed)).toBe(first.price * 3 + 500 + other.price);
    expect(groupCart(mixed)).toHaveLength(2);
  });
  it("merges equivalent notes, caps quantities, and rejects invalid items", () => {
    let lines = addLine([], first.id, 19, false, " hi ");
    lines = addLine(lines, first.id, 3, false, "hi");
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(20);
    expect(addLine(lines, "unknown")).toEqual(lines);
    expect(addLine(lines, first.id, -1)).toEqual(lines);
    expect(addLine(lines, first.id, 1.5)).toEqual(lines);
    const longNote = "x".repeat(200);
    const longLines = addLine(
      addLine([], first.id, 1, false, longNote),
      first.id,
      1,
      false,
      longNote,
    );
    expect(longLines).toHaveLength(1);
    expect(longLines[0].note).toHaveLength(180);
  });
  it("snapshots independent kitchen tickets with staggered readiness", () => {
    const cart = addLine(addLine([], first.id), other.id, 2);
    const orders = createOrders(cart, "24", " Alex ", 100000);
    expect(orders).toHaveLength(2);
    expect(new Set(orders.map((x) => x.id)).size).toBe(2);
    expect(
      orders.every(
        (x) => x.venueId === "koszyki" && x.table === "24" && x.name === "Alex",
      ),
    ).toBe(true);
    expect(orders.reduce((sum, x) => sum + x.total, 0)).toBe(cartTotal(cart));
    expect(orders[1].readyAt - orders[0].readyAt).toBe(2000);
    cart[0].quantity = 20;
    expect(orders[0].lines[0].quantity).toBe(1);
    expect(statusFor(orders[0], 100000)).toBe("received");
    expect(statusFor(orders[0], 103000)).toBe("received");
    expect(statusFor(orders[0], 103001)).toBe("preparing");
    expect(statusFor(orders[0], 111999)).toBe("preparing");
    expect(statusFor(orders[0], 112000)).toBe("ready");
    expect(statusFor({ ...orders[0], collected: true }, 100000)).toBe(
      "collected",
    );
  });
});
it("finishes even a basket from all nine kitchens within the short demo window", () => {
  const cart = restaurants.reduce(
    (lines, restaurant) =>
      addLine(
        lines,
        menu.find((item) => item.restaurantId === restaurant.id)!.id,
      ),
    [] as ReturnType<typeof addLine>,
  );
  const orders = createOrders(cart, "24", "Guest", 100000);
  expect(orders).toHaveLength(9);
  expect(Math.min(...orders.map((order) => order.readyAt))).toBe(112000);
  expect(Math.max(...orders.map((order) => order.readyAt))).toBe(128000);
  expect(orders.every((order) => statusFor(order, 128000) === "ready")).toBe(
    true,
  );
});
describe("QR and persistence boundaries", () => {
  it.each([
    ["?table=024", "24"],
    ["?table=999", "999"],
    ["?table=0", "24"],
    ["?table=-7", "24"],
    ["?table=1000", "24"],
    ["?table=7abc", "24"],
    ["", "24"],
  ])("validates %s", (query, expected) =>
    expect(tableFromURL(query)).toBe(expected),
  );
  it("restores valid customizations and rejects broken or tampered tickets", () => {
    const cart = addLine([], first.id, 2, true, "No onion");
    const orders = createOrders(cart, "9", "Guest", 1000);
    const state = {
      ...initialStore,
      cart,
      orders,
      locale: "en",
      favorites: [restaurants[0].id, "unknown"],
    };
    const restored = readStore(JSON.stringify(state));
    expect(restored.cart).toEqual(cart);
    expect(restored.orders).toEqual(orders);
    expect(
      readStore(
        JSON.stringify({
          ...state,
          orders: [{ ...orders[0], venueId: "another-hall" }],
        }),
      ).orders,
    ).toEqual([]);
    expect(
      readStore(
        JSON.stringify({
          ...state,
          orders: orders.map(({ venueId, ...old }) => old),
        }),
      ).orders,
    ).toEqual(orders);
    expect(restored.favorites).toEqual([restaurants[0].id]);
    expect(readStore("{broken")).toEqual(initialStore);
    expect(
      readStore(
        JSON.stringify({
          ...state,
          orders: [null, { ...orders[0], total: -1 }, orders[0]],
        }),
      ).orders,
    ).toEqual(orders);
    expect(
      readStore(
        JSON.stringify({ ...state, cart: [{ ...cart[0], quantity: 999 }] }),
      ).cart,
    ).toEqual([]);
  });
  it("keeps demo venue links and map numbers tied to the official directory", () => {
    expect(new Set(restaurants.map((r) => r.unit)).size).toBe(
      restaurants.length,
    );
    for (const item of menu)
      expect(restaurants.some((r) => r.id === item.restaurantId)).toBe(true);
    for (const r of restaurants)
      expect(r.source).toMatch(/^https:\/\/koszyki\.com\//);
  });
});
