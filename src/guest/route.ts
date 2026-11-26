export type View =
  | "home"
  | "menu"
  | "card"
  | "reviews"
  | "wifi"
  | "wallet"
  | "test"
  | "restore"
  | "missing";
export type GuestRoute = { view: View; placement?: "table" | "counter" };
const venuePath = "/v/sweeto";
export function venueId(pathname: string) {
  const match = pathname.match(
    /^\/(?:v|go)\/([a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?)(?:\/|$)/,
  );
  return match?.[1] === "maka-maslo" ? "sweeto" : match?.[1] || "sweeto";
}
export function guestPath(view: Exclude<View, "missing">, id = "sweeto") {
  const base = `/v/${id}`;
  return view === "home" ? base : `${base}/${view}`;
}
export function guestRoute(pathname: string): GuestRoute {
  const path = (pathname.replace(/\/$/, "") || "/").replace(
    /^\/(v|go)\/maka-maslo(?=\/|$)/,
    "/$1/sweeto",
  );
  if (
    ["/", venuePath, "/app", "/app.html", "/clip", "/clip.html"].includes(path)
  )
    return { view: "home" };
  if (path === "/go/sweeto/table") return { view: "home", placement: "table" };
  if (path === "/go/sweeto/counter")
    return { view: "card", placement: "counter" };
  if (path === "/go/sweeto/menu" || path === guestPath("menu"))
    return { view: "menu" };
  if (path === guestPath("card")) return { view: "card" };
  if (path === guestPath("wifi")) return { view: "wifi" };
  if (path === guestPath("reviews")) return { view: "reviews" };
  const venue = path.match(
    /^\/v\/([a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?)(?:\/(menu|card|reviews|wifi|wallet|test|restore))?$/,
  );
  if (venue) return { view: (venue[2] || "home") as View };
  const placement = path.match(
    /^\/go\/[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?\/(table|counter|menu)$/,
  );
  if (placement)
    return placement[1] === "menu"
      ? { view: "menu" }
      : {
          view: placement[1] === "counter" ? "card" : "home",
          placement: placement[1] as "table" | "counter",
        };
  return { view: "missing" };
}
