const venueId = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;
const resources = new Set(["venue", "loyalty", "wallet", "staff", "test"]);
const resultHeaders = ["content-type", "content-disposition", "etag", "last-modified", "www-authenticate", "allow", "retry-after"];

function venueEndpoint(path) {
  if (path === "/api/venues") return { venue: "sweeto", resource: "venues" };
  const [, api, scope, venue, resource] = path.split("/");
  if (api !== "api") return null;
  if (scope === "v" && venueId.test(venue ?? "") && resources.has(resource)) return { venue, resource };
  return resources.has(scope) ? { venue: "sweeto", resource: scope } : null;
}

function errorResponse(status, error) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function serviceOrigin(configured) {
  try {
    const url = new URL(configured);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

// Keep the ledger and Wallet worker on their durable host. The guest's browser
// and Wallet continue talking to the same PapuPay origin as the marketing site.
export async function forwardVenueRequest(request, configuredOrigin, send = fetch) {
  const url = new URL(request.url);
  const endpoint = venueEndpoint(url.pathname);
  if (!endpoint) return errorResponse(404, "not_found");
  const service = serviceOrigin(configuredOrigin);
  if (!service || service === url.origin || new URL(service).host === request.headers.get("host")) {
    return errorResponse(503, "venue_service_unavailable");
  }

  const origin = request.headers.get("origin");
  if (!["GET", "HEAD"].includes(request.method) &&
      (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== url.origin))) {
    return errorResponse(403, "invalid_origin");
  }
  const headers = new Headers();
  for (const name of ["accept", "accept-language", "content-type", "if-modified-since", "if-none-match"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const session = `papupay_${endpoint.venue}_${endpoint.resource === "staff" ? "staff" : "card"}=`;
  const usesSession = !["wallet", "venues"].includes(endpoint.resource);
  const cookie = (request.headers.get("cookie") ?? "").split(/;\s*/).find(item => item.startsWith(session));
  if (usesSession && cookie) headers.set("cookie", cookie);
  const authorization = request.headers.get("authorization");
  if (endpoint.resource === "wallet" && authorization && /^ApplePass /i.test(authorization)) {
    headers.set("authorization", authorization);
  }
  if (origin) headers.set("origin", service);
  try {
    const upstream = await send(service + url.pathname + url.search, {
      method: request.method, headers, body: request.body, duplex: "half",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(12000)]), redirect: "manual", cache: "no-store",
    });
    if ([301, 302, 303, 307, 308].includes(upstream.status)) {
      await upstream.body?.cancel();
      return errorResponse(502, "venue_service_unavailable");
    }
    const output = new Headers({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    for (const name of resultHeaders) {
      const value = upstream.headers.get(name);
      if (value) output.set(name, value);
    }
    for (const cookie of upstream.headers.getSetCookie()) {
      if (usesSession && cookie.startsWith(session)) output.append("set-cookie", cookie);
    }
    return new Response(upstream.body, { status: upstream.status, headers: output });
  } catch {
    return errorResponse(503, "venue_service_unavailable");
  }
}
