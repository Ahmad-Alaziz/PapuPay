export const HALL_ID = "koszyki";
export type OrderContext = { venueId: typeof HALL_ID; table: string };
export type Route =
  | { kind: "landing" | "choose" }
  | { kind: "order"; context: OrderContext }
  | { kind: "invalid"; reason: "hall" | "table" | "link" };
export function normalizeTable(value: string | null): string | null {
  return value && /^[0-9]{1,3}$/.test(value) && Number(value) > 0
    ? String(Number(value))
    : null;
}
export function qrPath(table: string, venueId = HALL_ID) {
  return `/go/${encodeURIComponent(venueId)}/${encodeURIComponent(table)}`;
}
// Paths are the printed QR contract. Never guess a hall/table from an invalid QR.
export function resolveRoute(url: URL): Route {
  const path = url.pathname.replace(/\/$/, "") || "/";
  const queries = url.searchParams;
  let hall: string | null = null,
    rawTable: string | null = null;
  if (path.startsWith("/go")) {
    const match = /^\/go\/([a-z0-9-]+)\/([0-9]{1,3})$/.exec(path);
    if (!match) return { kind: "invalid", reason: "link" };
    [, hall, rawTable] = match;
    // Conflicting query context must not override the physical table code.
    if (queries.has("venue") || queries.has("table"))
      return { kind: "invalid", reason: "link" };
  } else if (["/", "/app", "/app.html", "/clip"].includes(path)) {
    if (!queries.has("venue") && !queries.has("table")) {
      return { kind: path === "/" ? "landing" : "choose" };
    }
    if (
      queries.getAll("venue").length > 1 ||
      queries.getAll("table").length > 1
    )
      return { kind: "invalid", reason: "link" };
    hall = queries.get("venue") ?? HALL_ID; // Existing table-only demo links remain valid.
    rawTable = queries.get("table");
  } else return { kind: "invalid", reason: "link" };
  if (hall !== HALL_ID) return { kind: "invalid", reason: "hall" };
  const table = normalizeTable(rawTable);
  if (!table) return { kind: "invalid", reason: "table" };
  return { kind: "order", context: { venueId: HALL_ID, table } };
}
