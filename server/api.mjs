import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { ApiError, digest, openLoyalty, privateToken } from "./loyalty.mjs";
import { createGoogleWalletSigner } from "./google-wallet.mjs";
import { createDatabase } from "./postgres.mjs";
import { createWalletSigner } from "./wallet.mjs";
import { createWalletProtocol } from "./wallet-protocol.mjs";
import { createWalletRecovery } from "./wallet-recovery.mjs";
import { defaultVenueId, loadVenues, venueEnvironment, venueIdPattern, venueRegistry } from "./venues.mjs";

const guestLifetime = 60 * 60 * 24 * 365;
const staffLifetime = 60 * 60 * 12;
const attemptWindow = 60 * 15 * 1000;

export function configuredReviewLink(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port || url.username || url.password) return null;
    const { hostname, pathname } = url;
    if (hostname === "g.page" && /^\/r\/[\w-]+\/review\/?$/.test(pathname)) return url.href;
    if (hostname === "search.google.com" && pathname === "/local/writereview" && url.searchParams.get("placeid")) return url.href;
    if (hostname === "maps.app.goo.gl" && /^\/[\w-]+\/?$/.test(pathname)) return url.href;
    if (hostname === "goo.gl" && /^\/maps\/[\w-]+\/?$/.test(pathname)) return url.href;
    if (["www.google.com", "www.google.pl"].includes(hostname) && pathname.startsWith("/maps/place/")) return url.href;
    return null;
  } catch {
    return null;
  }
}

function configuredMenuPdf(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function configuredWifi(ssid, password, security, hidden) {
  const validText = (value, maxBytes) => typeof value === "string" && value.length > 0
    && Buffer.byteLength(value, "utf8") <= maxBytes && !/[\u0000-\u001f\u007f-\u009f]/.test(value);
  if (!validText(ssid, 32)) return null;
  if ((security != null && typeof security !== "string") || (hidden != null && typeof hidden !== "string")) return null;

  const type = (security || "WPA").trim().toUpperCase();
  if (!["WPA", "WEP", "NOPASS"].includes(type)) return null;
  const isHidden = (hidden || "false").trim().toLowerCase();
  if (!["true", "false", "1", "0"].includes(isHidden)) return null;
  if (type !== "NOPASS" && !validText(password, 64)) return null;
  if (type === "WPA") {
    const bytes = Buffer.byteLength(password, "utf8");
    if (bytes < 8 || (bytes > 63 && !/^[\da-f]{64}$/i.test(password))) return null;
  }

  return {
    settings: { ssid, security: type === "NOPASS" ? "nopass" : type, hidden: isHidden === "1" || isHidden === "true" },
    password: type === "NOPASS" ? "" : password,
  };
}

function readCookie(request, name) {
  const pair = request.headers.get("cookie")?.split(";").find((part) => part.trimStart().startsWith(`${name}=`));
  const value = pair?.trim().slice(name.length + 1);
  return value && /^[\w-]{43}$/.test(value) ? value : null;
}

function cookie(name, token, age, secure) {
  return `${name}=${token}; Path=/api; Max-Age=${age}; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
}

function respond(status, payload, headers = {}) {
  const baseHeaders = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers };
  if (status === 204) return new Response(null, { status, headers: baseHeaders });
  return Response.json(payload, { status, headers: { ...baseHeaders, "Content-Type": "application/json; charset=utf-8" } });
}

function validOrigin(request, url) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  // Next can normalize localhost in the URL while preserving the original Host.
  return origin === `${url.protocol}//${request.headers.get("host") || url.host}`;
}

async function readBody(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
    throw new ApiError(415, "invalid_request");
  }
  const limit = 4096;
  if (Number(request.headers.get("content-length")) > limit) throw new ApiError(413, "invalid_request");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "invalid_request");
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        await reader.cancel().catch(() => {});
        throw new ApiError(413, "invalid_request");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "invalid_request");
  } finally {
    reader.releaseLock();
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  } catch {
    // The endpoint returns the same error for malformed JSON and unusable fields.
  }
  throw new ApiError(400, "invalid_request");
}

function stringField(value, min, max) {
  if (typeof value !== "string") throw new ApiError(400, "invalid_request");
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max || /[\u0000-\u001f\u007f]/.test(trimmed)) {
    throw new ApiError(400, "invalid_request");
  }
  return trimmed;
}

function idField(value) {
  const id = stringField(value, 16, 100);
  if (!/^[\w-]+$/.test(id)) throw new ApiError(400, "invalid_request");
  return id;
}

function pinMatches(input, configured) {
  return Boolean(configured) && timingSafeEqual(Buffer.from(digest(input)), Buffer.from(digest(configured)));
}

function createVenueApi({
  brand, store, testEnabled, secureCookies,
  staffPin, managerPin, reviewLink, englishMenu, polishMenu, russianMenu,
  wifiSsid, wifiPassword, wifiSecurity, wifiHidden, wallet, googleWallet, googleClassId, env, recoveryClock,
}) {
  const guestCookie = `papupay_${brand.id}_card`;
  const staffCookie = `papupay_${brand.id}_staff`;
  const recovery = store && createWalletRecovery({
    env, brand, store: store.wallet, clock: recoveryClock, rateLimit: store.rateLimit,
  });
  const walletProtocol = store && createWalletProtocol({ brand, store: store.wallet, wallet, recovery, readBody, respond });
  const reviewUrl = configuredReviewLink(reviewLink);
  const menuPdf = { en: configuredMenuPdf(englishMenu), pl: configuredMenuPdf(polishMenu), ru: configuredMenuPdf(russianMenu) };
  const wifi = configuredWifi(wifiSsid, wifiPassword, wifiSecurity, wifiHidden);
  const demoStaff = testEnabled && !staffPin && !managerPin;
  const staffKey = staffPin || (demoStaff ? "2468" : undefined);
  const managerKey = managerPin || (demoStaff ? "1357" : undefined);
  const authScope = digest(JSON.stringify([demoStaff, staffKey, managerKey]));

  async function authorizePin(clientIP, pin) {
    if (!staffKey && !managerKey) throw new ApiError(503, "staff_not_configured");
    const manager = pinMatches(pin, managerKey);
    const staff = pinMatches(pin, staffKey);
    const allowed = await store.rateLimit("staff", clientIP, manager || staff, { limit: 8, windowMs: attemptWindow });
    if (!allowed) throw new ApiError(429, "too_many_attempts");
    if (!manager && !staff) throw new ApiError(401, "invalid_pin");
    return manager ? "manager" : "staff";
  }

  const guest = (request) => store.guest(readCookie(request, guestCookie));

  return async function handle(request, url, path, canonical, clientIP) {
    const { method } = request;
    const secure = secureCookies || url.protocol === "https:";

    if (path === "/api/venue" && method === "GET") {
      return respond(200, {
        ...(canonical ? brand : {}),
        reviewUrl,
        ...(Object.values(menuPdf).some(Boolean) ? { menuPdf } : {}),
        ...(wifi ? { wifi: wifi.settings } : {}),
      });
    }
    if (path === "/api/venue/wifi" && method === "GET") {
      return respond(200, { wifi: wifi ? { ...wifi.settings, password: wifi.password } : null });
    }
    if (path === "/api/test" && method === "GET") return respond(200, {
      enabled: testEnabled, ...(testEnabled && recovery.enabled ? { recoveryEnabled: true } : {}),
    });
    if (path.startsWith("/api/test/") && !testEnabled) throw new ApiError(404, "not_found");
    if (!store) throw new ApiError(503, "venue_service_unavailable");

    if (path === "/api/venue/review-click" && method === "POST") {
      if (reviewUrl) await store.countReviewClick();
      return respond(204);
    }
    if (path === "/api/loyalty/card" && ["GET", "POST"].includes(method)) {
      const current = await guest(request);
      if (current || method === "GET") return respond(200, { card: current });
      const token = privateToken();
      const card = await store.createGuest(token, Date.now() + guestLifetime * 1000);
      return respond(201, { card }, { "Set-Cookie": cookie(guestCookie, token, guestLifetime, secure) });
    }

    if (path === "/api/loyalty/wallet" && method === "GET") {
      const card = await guest(request);
      const status = !await wallet.available() ? "unconfigured" : card ? "ready" : "requires_card";
      return respond(200, {
        status,
        passUrl: status === "ready" ? `/api/v/${brand.id}/loyalty/apple-wallet.pkpass` : null,
        updatesEnabled: status !== "unconfigured" && Boolean(wallet.updateOrigin),
        recoveryEnabled: status !== "unconfigured" && await walletProtocol.offersRecovery(card),
        ...(googleWallet.available(googleClassId) ? { googleStatus: card ? "ready" : "requires_card" } : {}),
      });
    }
    if (path === "/api/loyalty/apple-wallet.pkpass" && ["GET", "HEAD"].includes(method)) {
      const card = await guest(request);
      if (!card) throw new ApiError(401, "card_required");
      return walletProtocol.issue(request, card);
    }
    if (path === "/api/loyalty/google-wallet" && method === "POST") {
      const card = await guest(request);
      if (!card) throw new ApiError(401, "card_required");
      const url = googleWallet.issue(googleClassId, brand, card);
      if (!url) throw new ApiError(503, "wallet_unconfigured");
      return respond(200, { url });
    }

    if (canonical && path.startsWith("/api/wallet/v1/")) return walletProtocol.handle(request, path);

    if (method === "POST" && ["/api/loyalty/restore", "/api/loyalty/restore/preview", "/api/loyalty/restore/revoke"].includes(path)) {
      if (!recovery.enabled) throw new ApiError(503, "recovery_unavailable");
      if (path === "/api/loyalty/restore/revoke") {
        const card = await guest(request);
        if (!card) throw new ApiError(401, "card_required");
        await store.wallet.revoke(card.checkout);
        return respond(204);
      }
      const { token, expectedCurrentCode } = await readBody(request);
      const check = await recovery.validate(token, clientIP);
      if (check.limited) throw new ApiError(429, "too_many_attempts");
      if (!check.entry) throw new ApiError(401, "invalid_restore");
      if (path === "/api/loyalty/restore/preview") {
        const { code, stamps, goal } = await store.wallet.card(check.entry);
        return respond(200, { code, stamps, goal, name: brand.name });
      }
      if (expectedCurrentCode !== undefined && expectedCurrentCode !== ((await guest(request))?.code ?? null)) {
        throw new ApiError(409, "membership_changed");
      }
      const session = privateToken();
      const card = await store.wallet.recover(check.entry.reference, check.entry.version, digest(session), Date.now() + guestLifetime * 1000);
      if (!card) throw new ApiError(401, "invalid_restore");
      return respond(200, { card }, { "Set-Cookie": cookie(guestCookie, session, guestLifetime, secure) });
    }

    if (path === "/api/test/restore-link" && method === "POST") {
      if (!recovery.enabled) throw new ApiError(404, "not_found");
      const card = await guest(request);
      if (!card) throw new ApiError(401, "card_required");
      return respond(200, { restorePath: await recovery.path(card.checkout) }, {
        "Set-Cookie": cookie(guestCookie, "", 0, secure),
      });
    }
    if (["/api/test/stamp", "/api/test/redeem"].includes(path) && method === "POST") {
      const card = await guest(request);
      if (!card) throw new ApiError(401, "card_required");
      const body = await readBody(request);
      const presented = stringField(body.code, 4, 64);
      if (presented !== card.checkout && presented.replace(/[\s-]/g, "").toUpperCase() !== card.code) {
        throw new ApiError(404, "card_not_found");
      }
      const kind = path.split("/").at(-1);
      const actionId = `test_${idField(body.actionId)}`;
      const receipt = kind === "stamp" ? `TEST-${digest(actionId).slice(0, 20)}` : null;
      const actor = { id: digest(`test:${brand.id}`), role: "test" };
      return respond(200, await store.updateCard({ code: card.checkout, kind, actionId, receipt, actor }));
    }

    if (!path.startsWith("/api/staff/")) throw new ApiError(404, "not_found");
    const staffToken = readCookie(request, staffCookie);
    const scopedToken = staffToken ? `${authScope}:${staffToken}` : null;
    const staff = await store.staff(scopedToken);
    const session = (role) => ({ authenticated: Boolean(role), manager: role === "manager", demo: demoStaff });
    if (path === "/api/staff/session") {
      if (method === "GET") return respond(200, session(staff?.role));
      if (method === "DELETE") {
        await store.deleteStaff(scopedToken);
        return respond(200, session(null), { "Set-Cookie": cookie(staffCookie, "", 0, secure) });
      }
      if (method === "POST") {
        const body = await readBody(request);
        const role = await authorizePin(clientIP, stringField(body.pin, 4, 128));
        const token = privateToken();
        await store.createStaff(`${authScope}:${token}`, role, Date.now() + staffLifetime * 1000, scopedToken);
        return respond(200, session(role), { "Set-Cookie": cookie(staffCookie, token, staffLifetime, secure) });
      }
    }
    if (!staff) throw new ApiError(401, "sign_in_required");
    if (path === "/api/staff/lookup" && method === "POST") {
      const body = await readBody(request);
      return respond(200, await store.lookup(stringField(body.code, 4, 64)));
    }
    if (["/api/staff/stamp", "/api/staff/redeem", "/api/staff/reverse"].includes(path) && method === "POST") {
      const kind = path.split("/").at(-1);
      if (kind === "reverse" && staff.role !== "manager") throw new ApiError(403, "manager_required");
      const body = await readBody(request);
      const action = { kind, code: stringField(body.code, 4, 64), actionId: idField(body.actionId), actor: staff };
      if (kind === "stamp") {
        action.receipt = stringField(stringField(body.receipt, 2, 80).normalize("NFKC").trim().replace(/\s+/g, " ").toUpperCase(), 2, 80);
      }
      if (kind === "reverse") {
        action.eventId = idField(body.eventId);
        action.reason = stringField(body.reason, 3, 160);
      }
      return respond(200, await store.updateCard(action));
    }
    throw new ApiError(404, "not_found");
  };
}

export function createPapupayApi(options = {}) {
  const env = options.env ?? process.env;
  const demoURL = env.PAPUPAY_DEMO_DATABASE_URL;
  const demoRequested = options.demo ?? env.PAPUPAY_DEMO === "1";
  const demo = demoRequested && env.NODE_ENV !== "production"
    && (options.database ? options.demo === true : Boolean(demoURL && demoURL !== env.DATABASE_URL));
  const connectionString = demo ? demoURL : env.DATABASE_URL;
  const directory = venueRegistry(options.venues ?? loadVenues(env.PAPUPAY_VENUES_FILE, env.PAPUPAY_VENUES_JSON));
  // The pool opens connections on demand. Public venue information can load
  // even when the deployment has no database credentials.
  const database = options.database ?? (connectionString
    ? createDatabase(connectionString, { namespace: demo ? "papupay_demo" : "papupay" })
    : null);
  const services = new Map();
  const wallet = options.wallet ?? createWalletSigner(env);
  const googleWallet = createGoogleWalletSigner(env);
  for (const [id, { brand, settings }] of directory) {
    const primary = id === defaultVenueId;
    const scopedEnv = venueEnvironment(id, env);
    const value = (option, key) => (primary ? options[option] : undefined) ?? scopedEnv(key)
      ?? (primary ? env[`PAPUPAY_${key}`] : undefined);
    const store = database ? openLoyalty(database.venue(id)) : null;
    services.set(id, createVenueApi({
      brand, store, testEnabled: Boolean(store && demo), wallet, googleWallet, env, recoveryClock: options.recoveryClock,
      googleClassId: value("googleClassId", "GOOGLE_WALLET_CLASS_ID"),
      secureCookies: options.secureCookies ?? env.NODE_ENV === "production",
      staffPin: value("staffPin", "STAFF_PIN"), managerPin: value("managerPin", "MANAGER_PIN"),
      reviewLink: value("reviewLink", "GOOGLE_REVIEW_URL") ?? settings.reviewUrl,
      englishMenu: value("englishMenu", "MENU_PDF_EN_URL") ?? settings.menuPdf?.en,
      polishMenu: value("polishMenu", "MENU_PDF_PL_URL") ?? settings.menuPdf?.pl,
      russianMenu: value("russianMenu", "MENU_PDF_RU_URL") ?? settings.menuPdf?.ru,
      wifiSsid: value("wifiSsid", "WIFI_SSID"), wifiPassword: value("wifiPassword", "WIFI_PASSWORD"),
      wifiSecurity: value("wifiSecurity", "WIFI_SECURITY"), wifiHidden: value("wifiHidden", "WIFI_HIDDEN"),
    }));
  }

  const resources = new Set(["venue", "loyalty", "wallet", "staff", "test"]);
  const clientIPHeader = env.VERCEL === "1" ? "x-vercel-forwarded-for" : env.PAPUPAY_TRUSTED_CLIENT_IP_HEADER;

  return {
    async handle(request, { clientIP } = {}) {
      const url = new URL(request.url);
      const path = url.pathname;
      if (!path.startsWith("/api/")) return respond(404, { error: "not_found" });
      if (!["GET", "HEAD"].includes(request.method) && !validOrigin(request, url)) {
        return respond(403, { error: "invalid_origin" });
      }
      if (path === "/api/venues" && request.method === "GET") {
        return respond(200, { venues: [...directory.values()].map(({ brand }) => brand) });
      }
      const scoped = path.startsWith("/api/v/");
      const parts = scoped ? /^\/api\/v\/([^/]+)(\/.*)$/.exec(path) : null;
      const id = scoped ? parts?.[1] : defaultVenueId;
      if (!id || !venueIdPattern.test(id) || !services.has(id)) return respond(404, { error: "venue_not_found" });
      const endpoint = scoped ? `/api${parts[2]}` : path;
      if (!resources.has(endpoint.split("/")[2])) return respond(404, { error: "not_found" });
      // Only a trusted ingress may provide this header. Local requests and
      // self-hosted requests without one use a shared fallback bucket.
      const address = clientIP ?? (clientIPHeader ? request.headers.get(clientIPHeader)?.trim() : undefined);
      try {
        return await services.get(id)(request, url, endpoint, scoped, isIP(address ?? "") ? address : "unknown");
      } catch (error) {
        if (error instanceof ApiError) return respond(error.status, { error: error.message });
        console.error("PapuPay venue request failed", error.code ?? error.name);
        if (/^(08|57P0[123]|42P01|ECONN|ETIMEDOUT|ENOTFOUND)/.test(error.code ?? "")
          || error.message === "Connection terminated due to connection timeout") {
          return respond(503, { error: "venue_service_unavailable" });
        }
        return respond(500, { error: "server_error" });
      }
    },
    async close() {
      wallet.close();
      if (!options.database) await database?.close();
    },
  };
}
