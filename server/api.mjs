import { timingSafeEqual } from "node:crypto";
import { isAbsolute } from "node:path";
import { ApiError, digest, openLoyalty, privateToken } from "./loyalty.mjs";
import { createGoogleWalletSigner } from "./google-wallet.mjs";
import { createWalletSigner } from "./wallet.mjs";
import { startWalletWorker } from "./wallet-apns.mjs";
import { createWalletProtocol } from "./wallet-protocol.mjs";
import { createWalletRecovery } from "./wallet-recovery.mjs";
import { defaultVenueDatabase, defaultVenueId, loadVenues, venueEnvironment, venueIdPattern, venueRegistry } from "./venues.mjs";

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
  const pair = request.headers.cookie?.split(";").find((part) => part.trimStart().startsWith(`${name}=`));
  const value = pair?.trim().slice(name.length + 1);
  return value && /^[\w-]{43}$/.test(value) ? value : null;
}

function cookie(name, token, age, secure) {
  return `${name}=${token}; Path=/api; Max-Age=${age}; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
}

function respond(response, status, payload, headers = {}) {
  const baseHeaders = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers };
  if (status === 204) {
    response.writeHead(status, baseHeaders).end();
  } else {
    response.writeHead(status, { ...baseHeaders, "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(payload));
  }
}

function validOrigin(request) {
  if (request.headers["sec-fetch-site"] === "cross-site") return false;
  if (!request.headers.origin) return true;
  try {
    return new URL(request.headers.origin).host === request.headers.host;
  } catch {
    return false;
  }
}

async function readBody(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers["content-type"] ?? "")) {
    throw new ApiError(415, "invalid_request");
  }
  let bytes = 0;
  const chunks = [];
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes <= 4096) chunks.push(chunk);
  }
  if (bytes > 4096) throw new ApiError(413, "invalid_request");
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
  brand, database, testEnabled, secureCookies,
  staffPin, managerPin, reviewLink, englishMenu, polishMenu, russianMenu,
  wifiSsid, wifiPassword, wifiSecurity, wifiHidden, wallet, googleWallet, googleClassId, env, recoveryClock,
}) {
  const guestCookie = `papupay_${brand.id}_card`;
  const staffCookie = `papupay_${brand.id}_staff`;
  const store = openLoyalty(database, brand.id);
  const recovery = createWalletRecovery({ env, brand, store: store.wallet, clock: recoveryClock });
  const walletProtocol = createWalletProtocol({ brand, store: store.wallet, wallet, recovery, readBody, respond });
  const stopWallet = startWalletWorker(store.wallet, wallet);
  const attempts = new Map();
  const reviewUrl = configuredReviewLink(reviewLink);
  const menuPdf = { en: configuredMenuPdf(englishMenu), pl: configuredMenuPdf(polishMenu), ru: configuredMenuPdf(russianMenu) };
  const wifi = configuredWifi(wifiSsid, wifiPassword, wifiSecurity, wifiHidden);
  const demoStaff = testEnabled && !staffPin && !managerPin;
  const staffKey = staffPin || (demoStaff ? "2468" : undefined);
  const managerKey = managerPin || (demoStaff ? "1357" : undefined);
  const authScope = digest(JSON.stringify([demoStaff, staffKey, managerKey]));

  function authorizePin(request, pin) {
    if (!staffKey && !managerKey) throw new ApiError(503, "staff_not_configured");
    const now = Date.now();
    for (const [key, entry] of attempts) {
      if (entry.expiresAt <= now) attempts.delete(key);
    }
    const key = request.socket.remoteAddress ?? "unknown";
    const entry = attempts.get(key) ?? { count: 0, expiresAt: now + attemptWindow };
    if (entry.count >= 8 || (!attempts.has(key) && attempts.size >= 10_000)) {
      throw new ApiError(429, "too_many_attempts");
    }
    const manager = pinMatches(pin, managerKey);
    const staff = pinMatches(pin, staffKey);
    if (manager || staff) {
      attempts.delete(key);
      return manager ? "manager" : "staff";
    }
    entry.count += 1;
    attempts.set(key, entry);
    throw new ApiError(401, "invalid_pin");
  }

  const guest = (request) => store.guest(readCookie(request, guestCookie));

  async function handle(request, response, path, canonical) {
    const { method } = request;
    if (method !== "GET" && !validOrigin(request)) throw new ApiError(403, "invalid_origin");
    const secure = secureCookies || Boolean(request.socket.encrypted);

    if (path === "/api/venue" && method === "GET") {
      return respond(response, 200, {
        ...(canonical ? brand : {}),
        reviewUrl,
        ...(Object.values(menuPdf).some(Boolean) ? { menuPdf } : {}),
        ...(wifi ? { wifi: wifi.settings } : {}),
      });
    }
    if (path === "/api/venue/wifi" && method === "GET") {
      return respond(response, 200, { wifi: wifi ? { ...wifi.settings, password: wifi.password } : null });
    }
    if (path === "/api/venue/review-click" && method === "POST") {
      if (reviewUrl) store.countReviewClick();
      return respond(response, 204);
    }
    if (path === "/api/loyalty/card" && ["GET", "POST"].includes(method)) {
      const current = guest(request);
      if (current || method === "GET") return respond(response, 200, { card: current });
      const token = privateToken();
      const card = store.createGuest(token, Date.now() + guestLifetime * 1000);
      return respond(response, 201, { card }, { "Set-Cookie": cookie(guestCookie, token, guestLifetime, secure) });
    }

    if (path === "/api/loyalty/wallet" && method === "GET") {
      const card = guest(request);
      const status = !await wallet.available() ? "unconfigured" : card ? "ready" : "requires_card";
      return respond(response, 200, {
        status,
        passUrl: status === "ready" ? `/api/v/${brand.id}/loyalty/apple-wallet.pkpass` : null,
        updatesEnabled: status !== "unconfigured" && Boolean(wallet.updateOrigin),
        recoveryEnabled: status !== "unconfigured" && walletProtocol.offersRecovery(card),
        ...(googleWallet.available(googleClassId) ? { googleStatus: card ? "ready" : "requires_card" } : {}),
      });
    }
    if (path === "/api/loyalty/apple-wallet.pkpass" && ["GET", "HEAD"].includes(method)) {
      const card = guest(request);
      if (!card) throw new ApiError(401, "card_required");
      return walletProtocol.issue(request, response, card);
    }
    if (path === "/api/loyalty/google-wallet" && method === "POST") {
      const card = guest(request);
      if (!card) throw new ApiError(401, "card_required");
      const url = googleWallet.issue(googleClassId, brand, card);
      if (!url) throw new ApiError(503, "wallet_unconfigured");
      return respond(response, 200, { url });
    }

    if (canonical && path.startsWith("/api/wallet/v1/")) return walletProtocol.handle(request, response, path);

    if (recovery.enabled && method === "POST" && ["/api/loyalty/restore", "/api/loyalty/restore/preview", "/api/loyalty/restore/revoke"].includes(path)) {
      if (path === "/api/loyalty/restore/revoke") {
        const card = guest(request);
        if (!card) throw new ApiError(401, "card_required");
        store.wallet.revoke(card.checkout);
        return respond(response, 204);
      }
      const { token } = await readBody(request);
      const check = recovery.validate(token, request.socket.remoteAddress);
      if (check.limited) throw new ApiError(429, "too_many_attempts");
      if (!check.entry) throw new ApiError(401, "invalid_restore");
      if (path === "/api/loyalty/restore/preview") {
        const { code, stamps, goal } = store.wallet.card(check.entry);
        return respond(response, 200, { code, stamps, goal, name: brand.name });
      }
      const session = privateToken();
      const card = store.wallet.recover(check.entry.reference, check.entry.version, digest(session), Date.now() + guestLifetime * 1000);
      if (!card) throw new ApiError(401, "invalid_restore");
      return respond(response, 200, { card }, { "Set-Cookie": cookie(guestCookie, session, guestLifetime, secure) });
    }

    if (path === "/api/test" && method === "GET") return respond(response, 200, {
      enabled: testEnabled, ...(testEnabled && recovery.enabled ? { recoveryEnabled: true } : {}),
    });
    if (path === "/api/test/restore-link" && method === "POST") {
      if (!testEnabled || !recovery.enabled) throw new ApiError(404, "not_found");
      const card = guest(request);
      if (!card) throw new ApiError(401, "card_required");
      return respond(response, 200, { restorePath: recovery.path(card.checkout) }, {
        "Set-Cookie": cookie(guestCookie, "", 0, secure),
      });
    }
    if (["/api/test/stamp", "/api/test/redeem"].includes(path) && method === "POST") {
      if (!testEnabled) throw new ApiError(404, "not_found");
      const card = guest(request);
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
      return respond(response, 200, store.updateCard({ code: card.checkout, kind, actionId, receipt, actor }));
    }

    if (!path.startsWith("/api/staff/")) throw new ApiError(404, "not_found");
    const staffToken = readCookie(request, staffCookie);
    const scopedToken = staffToken ? `${authScope}:${staffToken}` : null;
    const staff = store.staff(scopedToken);
    const session = (role) => ({ authenticated: Boolean(role), manager: role === "manager", demo: demoStaff });
    if (path === "/api/staff/session") {
      if (method === "GET") return respond(response, 200, session(staff?.role));
      if (method === "DELETE") {
        store.deleteStaff(scopedToken);
        return respond(response, 200, session(null), { "Set-Cookie": cookie(staffCookie, "", 0, secure) });
      }
      if (method === "POST") {
        const body = await readBody(request);
        const role = authorizePin(request, stringField(body.pin, 4, 128));
        const token = privateToken();
        store.deleteStaff(scopedToken);
        store.createStaff(`${authScope}:${token}`, role, Date.now() + staffLifetime * 1000);
        return respond(response, 200, session(role), { "Set-Cookie": cookie(staffCookie, token, staffLifetime, secure) });
      }
    }
    if (!staff) throw new ApiError(401, "sign_in_required");
    if (path === "/api/staff/lookup" && method === "POST") {
      const body = await readBody(request);
      return respond(response, 200, store.lookup(stringField(body.code, 4, 64)));
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
      return respond(response, 200, store.updateCard(action));
    }
    throw new ApiError(404, "not_found");
  }

  return { handle, close() { stopWallet(); store.close(); } };
}

export function createPapupayApi(options = {}) {
  const env = options.env ?? process.env;
  const demo = Boolean(options.demo) && env.NODE_ENV !== "production";
  const directory = venueRegistry(options.venues ?? loadVenues(env.PAPUPAY_VENUES_FILE));
  const services = new Map();
  const wallet = options.wallet ?? createWalletSigner(env);
  const googleWallet = createGoogleWalletSigner(env);
  try {
    for (const [id, { brand, settings }] of directory) {
      const primary = id === defaultVenueId;
      const scopedEnv = venueEnvironment(id, env);
      const value = (option, key) => (primary ? options[option] : undefined) ?? scopedEnv(key)
        ?? (primary ? env[`PAPUPAY_${key}`] : undefined);
      const configuredDatabase = value("database", "DB");
      if (env.NODE_ENV === "production" && (!configuredDatabase || !isAbsolute(configuredDatabase))) {
        throw new Error(`Configure an absolute persistent database path for ${id} before starting the loyalty service.`);
      }
      const database = configuredDatabase ?? (options.database === ":memory:" ? ":memory:" : defaultVenueDatabase(id, demo));
      const testEnabled = demo && (database === ":memory:" || database === defaultVenueDatabase(id, true));
      services.set(id, createVenueApi({
        brand, database, testEnabled, wallet, googleWallet, env, recoveryClock: options.recoveryClock,
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
  } catch (error) {
    for (const service of services.values()) service.close();
    wallet.close();
    throw error;
  }

  return {
    middleware(request, response, next) {
      const path = request.url?.split("?", 1)[0] ?? "";
      if (!path.startsWith("/api/")) return next();
      if (path === "/api/venues" && request.method === "GET") {
        return respond(response, 200, { venues: [...directory.values()].map(({ brand }) => brand) });
      }
      const scoped = path.startsWith("/api/v/");
      const parts = scoped ? /^\/api\/v\/([^/]+)(\/.*)$/.exec(path) : null;
      const id = scoped ? parts?.[1] : defaultVenueId;
      if (!id || !venueIdPattern.test(id) || !services.has(id)) return respond(response, 404, { error: "venue_not_found" });
      const endpoint = scoped ? `/api${parts[2]}` : path;
      void services.get(id).handle(request, response, endpoint, scoped).catch((error) => {
        if (error instanceof ApiError) respond(response, error.status, { error: error.message });
        else {
          console.error("PapuPay request failed", error.code ?? error.name);
          respond(response, 500, { error: "server_error" });
        }
      });
    },
    close() { for (const service of services.values()) service.close(); wallet.close(); },
  };
}
