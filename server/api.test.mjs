import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID, verify } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { configuredReviewLink, createPapupayApi } from "./api.mjs";
import { walletSerial } from "./wallet.mjs";

async function start(t, options = {}) {
  const api = createPapupayApi({ database: ":memory:", staffPin: "", managerPin: "", reviewLink: "", wifiSsid: "", wifiHidden: "", wifiSecurity: "", ...options });
  t.after(api.close);
  return function request(path, { body, method = body ? "POST" : "GET", cookie, origin, headers = {} } = {}) {
    const request = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
    request.headers = { host: "papupay.test", "content-type": body ? "application/json" : undefined, cookie, origin, ...headers };
    request.url = path;
    request.method = method;
    request.socket = { remoteAddress: "127.0.0.1" };
    return new Promise((resolve, reject) => {
      const response = {
        writeHead(status, headers) {
          this.status = status;
          this.headers = headers;
          return this;
        },
        end(data) {
          resolve({
            status: this.status,
            data: data ? JSON.parse(data) : undefined,
            cookie: this.headers["Set-Cookie"]?.split(";")[0],
            headers: this.headers,
            cacheControl: this.headers["Cache-Control"],
          });
        },
      };
      api.middleware(request, response, () => reject(new Error(`Unknown API path ${path}`)));
    });
  };
}

test("memberships are isolated and persist across server instances", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "papupay-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const database = join(dir, "app.sqlite");
  const a = await start(t, { database });
  assert.deepEqual((await a("/api/loyalty/card")).data, { card: null });
  const joined = await a("/api/loyalty/card", { method: "POST" });
  assert.equal(joined.status, 201);
  assert.match(joined.cookie, /^papupay_sweeto_card=/);
  assert.match(joined.data.card.code, /^[A-Z2-9]{8}$/);
  assert.match(joined.data.card.checkout, /^pp_[\w-]{24}$/);

  const b = await start(t, { database });
  assert.deepEqual((await b("/api/loyalty/card", { cookie: joined.cookie })).data, joined.data);
  assert.deepEqual((await b("/api/loyalty/card", { method: "POST", cookie: joined.cookie })).data, joined.data);
  assert.deepEqual((await b("/api/loyalty/card")).data, { card: null });
});

test("Sweeto never opens the previous venue's loyalty ledger", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "papupay-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const database = join(dir, "previous.sqlite");
  const old = new DatabaseSync(database);
  old.exec("CREATE TABLE memberships (id TEXT PRIMARY KEY); INSERT INTO memberships VALUES ('old-venue-card');");
  assert.throws(() => createPapupayApi({ database }), /Use a new database for sweeto/);
  assert.equal(old.prepare("SELECT id FROM memberships").get().id, "old-venue-card");
  assert.equal(old.prepare("SELECT name FROM sqlite_schema WHERE name = 'papupay_venue'").get(), undefined);
  old.close();
});

test("staff auth separates writes, rejects cross-origin requests, and invalidates rotated credentials", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "papupay-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const database = join(dir, "app.sqlite");
  const dev = await start(t, { database, demo: true, staffPin: "dev-staff-secret" });
  const live = await start(t, { database, staffPin: "live-staff-secret" });
  const lookup = { body: { code: "AABBCCDD" } };
  assert.equal((await dev("/api/staff/lookup", lookup)).status, 401);
  assert.equal((await live("/api/staff/session", { body: { pin: "2468" } })).data.error, "invalid_pin");
  const auth = await dev("/api/staff/session", { body: { pin: "dev-staff-secret" } });
  assert.deepEqual(auth.data, { authenticated: true, manager: false, demo: false });
  assert.equal((await live("/api/staff/lookup", { ...lookup, cookie: auth.cookie })).status, 401);
  assert.equal((await dev("/api/staff/lookup", { ...lookup, cookie: auth.cookie, origin: "https://elsewhere.test" })).status, 403);
  assert.equal((await dev("/api/staff/session", { method: "DELETE", cookie: auth.cookie })).status, 200);
  assert.equal((await dev("/api/staff/lookup", { ...lookup, cookie: auth.cookie })).status, 401);
});

test("development cannot use demo staff PINs to write to a custom persistent ledger", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "papupay-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const database = join(dir, "live.sqlite");
  const custom = await start(t, { database, demo: true, env: {} });
  assert.deepEqual((await custom("/api/v/sweeto/test")).data, { enabled: false });
  assert.deepEqual((await custom("/api/staff/session")).data, { authenticated: false, manager: false, demo: false });
  assert.equal((await custom("/api/staff/session", { body: { pin: "2468" } })).data.error, "staff_not_configured");
  assert.equal((await custom("/api/staff/session", { body: { pin: "1357" } })).status, 503);

  const isolated = await start(t, { demo: true, env: {} });
  assert.deepEqual((await isolated("/api/staff/session", { body: { pin: "1357" } })).data, {
    authenticated: true, manager: true, demo: true,
  });
});

test("retries and duplicate receipt scans never double-stamp, and only one till can redeem a reward", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "papupay-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const database = join(dir, "app.sqlite");
  const options = { database, demo: true, staffPin: "2468", managerPin: "1357" };
  const [a, b] = await Promise.all([start(t, options), start(t, options)]);
  const guest = await a("/api/loyalty/card", { method: "POST" });
  const { checkout, code } = guest.data.card;
  const cashiers = await Promise.all([a, b].map((request) => request("/api/staff/session", { body: { pin: "2468" } })));
  const manager = await a("/api/staff/session", { body: { pin: "1357" } });
  const stamp = { receipt: "Nov15/1/001", actionId: randomUUID(), code: checkout };
  const first = await a("/api/staff/stamp", { body: stamp, cookie: cashiers[0].cookie });
  assert.equal(first.data.card.stamps, 1);
  const retry = await b("/api/staff/stamp", { body: { ...stamp, code }, cookie: cashiers[1].cookie });
  assert.deepEqual(retry.data, first.data);
  const repeat = await b("/api/staff/stamp", { body: { ...stamp, receipt: "nov15/1/001", actionId: randomUUID() }, cookie: cashiers[1].cookie });
  assert.equal(repeat.data.error, "receipt_already_used");
  const conflict = await b("/api/staff/stamp", { body: { ...stamp, receipt: "Nov15/1/002" }, cookie: cashiers[1].cookie });
  assert.equal(conflict.data.error, "action_conflict");

  for (let index = 2; index <= 6; index++) {
    const response = await a("/api/staff/stamp", { body: { code, receipt: `Nov15/1/00${index}`, actionId: randomUUID() }, cookie: cashiers[0].cookie });
    assert.equal(response.data.card.stamps, index);
  }
  assert.equal((await a("/api/loyalty/card", { cookie: guest.cookie })).data.card.rewardAvailable, true);

  const claims = await Promise.all([a, b].map((request, index) => request("/api/staff/redeem", {
    body: { code, actionId: randomUUID() }, cookie: cashiers[index].cookie,
  })));
  assert.deepEqual(claims.map((response) => response.status).sort(), [200, 409]);
  const redeemed = claims.find((response) => response.status === 200).data;
  const reverse = { code, eventId: redeemed.events[0].id, reason: "Wrong item", actionId: randomUUID() };
  assert.equal((await a("/api/staff/reverse", { body: reverse, cookie: cashiers[0].cookie })).status, 403);
  const restored = await a("/api/staff/reverse", { body: reverse, cookie: manager.cookie });
  assert.equal(restored.data.card.rewardAvailable, true);
  assert.equal(restored.data.events.find((event) => event.id === reverse.eventId).reversed, true);
  assert.equal((await a("/api/loyalty/card", { cookie: guest.cookie })).data.card.stamps, 6);
});

test("venue configuration returns HTTPS menus and allowlisted Google review destinations", async (t) => {
  assert.equal(configuredReviewLink("https://g.page/r/example/review"), "https://g.page/r/example/review");
  assert.equal(configuredReviewLink("https://g.page/r/example/review@fraud.test"), null);
  assert.equal(configuredReviewLink("https://g.page@fraud.test/r/example/review"), null);
  assert.equal(configuredReviewLink("http://g.page/r/example/review"), null);
  const reviewUrl = "https://search.google.com/local/writereview?placeid=test";
  const englishMenu = "https://example.com/menu.pdf";
  const russianMenu = "https://example.com/меню.pdf";
  const request = await start(t, { demo: true, reviewLink: reviewUrl, englishMenu, polishMenu: "javascript:alert(1)", russianMenu });
  assert.deepEqual((await request("/api/venue")).data, { reviewUrl, menuPdf: { en: englishMenu, pl: null, ru: new URL(russianMenu).href } });
  assert.equal((await request("/api/venue/review-click", { method: "POST" })).status, 204);
});

test("Wi-Fi is optional and exposes the password only in the uncached details response", async (t) => {
  const absent = await start(t);
  assert.equal((await absent("/api/venue")).data.wifi, undefined);
  assert.deepEqual((await absent("/api/venue/wifi")).data, { wifi: null });

  const settings = { ssid: "Test Network", security: "WPA", hidden: true };
  const password = "example;guest:pass";
  const request = await start(t, { wifiSsid: settings.ssid, wifiPassword: password, wifiHidden: "1" });
  assert.deepEqual((await request("/api/venue")).data.wifi, settings);
  const details = await request("/api/venue/wifi");
  assert.equal(details.cacheControl, "no-store");
  assert.deepEqual(details.data, { wifi: { ...settings, password } });
});

test("Wi-Fi rejects malformed settings and supports open networks", async (t) => {
  const invalid = await start(t, { wifiSsid: "ż".repeat(17), wifiPassword: "example-pass" });
  assert.deepEqual((await invalid("/api/venue/wifi")).data, { wifi: null });
  const invalidPassword = await start(t, { wifiSsid: "Test", wifiPassword: "secret\ntext" });
  assert.deepEqual((await invalidPassword("/api/venue/wifi")).data, { wifi: null });
  const shortPassword = await start(t, { wifiSsid: "Test", wifiPassword: "abc" });
  assert.deepEqual((await shortPassword("/api/venue/wifi")).data, { wifi: null });

  const open = await start(t, { wifiSsid: "Test Network", wifiSecurity: "nopass", wifiPassword: "ignored-password" });
  assert.deepEqual((await open("/api/venue/wifi")).data, { wifi: {
    ssid: "Test Network", security: "nopass", hidden: false, password: "",
  } });
});

test("venue branding and guest/staff sessions stay isolated even inside one browser", async (t) => {
  const options = { venues: [
    { id: "berry-counter", name: "Berry Counter", theme: { motionTheme: "berry" }, menuPdf: { pl: "https://example.test/berry.pdf" } },
    { id: "forest-counter", name: "Forest Counter", theme: { motionTheme: "forest" } },
  ], env: {
    PAPUPAY_VENUE_BERRY_COUNTER_STAFF_PIN: "berry-staff-1234",
    PAPUPAY_VENUE_FOREST_COUNTER_STAFF_PIN: "forest-staff-1234",
  } };
  const request = await start(t, options);
  const path = (venue, endpoint) => `/api/v/${venue}${endpoint}`;
  const berry = (endpoint) => path("berry-counter", endpoint);
  const forest = (endpoint) => path("forest-counter", endpoint);
  const brands = (await request("/api/venues")).data.venues;
  assert.deepEqual(brands.map(({ id, name }) => [id, name]), [["sweeto", "Sweeto"], ["berry-counter", "Berry Counter"], ["forest-counter", "Forest Counter"]]);
  assert.equal((await request(berry("/venue"))).data.theme.ink, "#64344e");
  assert.equal((await request(berry("/venue"))).data.menuPdf.pl, "https://example.test/berry.pdf");
  assert.equal((await request(forest("/venue"))).data.theme.ink, "#173c2b");
  assert.equal((await request(path("does-not-exist", "/venue"))).status, 404);

  const guestA = await request(berry("/loyalty/card"), { method: "POST" });
  const guestB = await request(forest("/loyalty/card"), { method: "POST" });
  assert.match(guestA.cookie, /^papupay_berry-counter_card=/);
  assert.equal((await request(forest("/loyalty/card"), { cookie: guestA.cookie })).data.card, null);
  const sharedCookies = `${guestA.cookie}; ${guestB.cookie}`;
  assert.deepEqual((await request(berry("/loyalty/card"), { cookie: sharedCookies })).data, guestA.data);
  assert.deepEqual((await request(forest("/loyalty/card"), { cookie: sharedCookies })).data, guestB.data);

  const staffA = await request(berry("/staff/session"), { body: { pin: "berry-staff-1234" } });
  assert.equal(staffA.data.authenticated, true);
  assert.equal((await request(forest("/staff/session"), { cookie: staffA.cookie })).data.authenticated, false);
  const staffB = await request(forest("/staff/session"), { body: { pin: "forest-staff-1234" } });
  assert.equal((await request(forest("/staff/lookup"), { cookie: staffB.cookie, body: { code: guestA.data.card.checkout } })).status, 404);
});

test("malformed or unregistered canonical tenants never fall through to Sweeto", async (t) => {
  const request = await start(t, { env: {} });
  const invalid = ["missing-counter", "-", "sweeto-", "%73weeto", "sweeto%2f..", "sweeto/../sweeto", "sweeto/", "a".repeat(33)];
  for (const id of invalid) {
    const result = await request(`/api/v/${id}/loyalty/card`, { method: "POST" });
    assert.equal(result.status, 404, `Tenant path ${id} must not create a card`);
    assert.equal(result.cookie, undefined);
  }
  const legacy = await request("/api/loyalty/card", { method: "POST" });
  const canonical = await request("/api/v/sweeto/loyalty/card", { cookie: legacy.cookie });
  assert.deepEqual(canonical.data, legacy.data);
});

test("the demo scanner verifies ownership, applies stamp and redemption idempotently, and stays disabled in production", async (t) => {
  const path = "/api/v/sweeto";
  const request = await start(t, { env: {}, demo: true });
  assert.deepEqual((await request(path + "/test")).data, { enabled: true });
  const guest = await request(path + "/loyalty/card", { method: "POST" });
  const other = await request(path + "/loyalty/card", { method: "POST" });
  const { checkout, code } = guest.data.card;
  const stamp = (presented = checkout, actionId = randomUUID()) => ({ cookie: guest.cookie, body: { code: presented, actionId } });
  assert.equal((await request(path + "/test/stamp", stamp(other.data.card.checkout))).status, 404);
  assert.equal((await request(path + "/test/redeem", stamp())).data.error, "reward_unavailable");

  const first = stamp(checkout);
  assert.equal((await request(path + "/test/stamp", first)).data.card.stamps, 1);
  assert.equal((await request(path + "/test/stamp", first)).data.card.stamps, 1);
  for (let count = 2; count <= 6; count += 1) assert.equal((await request(path + "/test/stamp", stamp(code))).data.card.stamps, count);
  const claim = stamp(code);
  const redeemed = await request(path + "/test/redeem", claim);
  assert.equal(redeemed.data.card.stamps, 0);
  assert.deepEqual((await request(path + "/test/redeem", claim)).data, redeemed.data);

  const dir = await mkdtemp(join(tmpdir(), "papupay-production-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const production = await start(t, { database: join(dir, "venue.sqlite"), env: { NODE_ENV: "production" }, demo: true });
  assert.deepEqual((await production(path + "/test")).data, { enabled: false });
  assert.equal((await production(path + "/test/stamp", first)).status, 404);
});

test("no Apple Wallet package is served without validated signing credentials", async (t) => {
  const request = await start(t, { env: {} });
  const path = "/api/v/sweeto/loyalty";
  assert.deepEqual((await request(path + "/wallet")).data, {
    status: "unconfigured", passUrl: null, updatesEnabled: false, recoveryEnabled: false,
  });
  assert.equal((await request(path + "/apple-wallet.pkpass")).status, 401);
  const { cookie } = await request(path + "/card", { method: "POST" });
  const pass = await request(path + "/apple-wallet.pkpass", { cookie });
  assert.equal(pass.status, 503);
  assert.deepEqual(pass.data, { error: "wallet_unconfigured" });
});

test("Google Wallet issues a signed checkout QR for the active venue membership", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "papupay-google-wallet-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const credentialPath = join(directory, "service-account.json");
  const email = "wallet@example.iam.gserviceaccount.com";
  await writeFile(credentialPath, JSON.stringify({
    type: "service_account",
    client_email: email,
    private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
  }), { mode: 0o600 });
  const classId = "123456789012345.sweeto";
  const request = await start(t, {
    venues: [{ id: "berry-counter", name: "Berry Counter" }, { id: "forest-counter", name: "Forest Counter" }],
    env: {
      PAPUPAY_GOOGLE_WALLET_CLASS_ID: classId,
      PAPUPAY_VENUE_FOREST_COUNTER_GOOGLE_WALLET_CLASS_ID: "123456789012345.forest",
      PAPUPAY_GOOGLE_WALLET_SERVICE_ACCOUNT_PATH: credentialPath,
    },
  });
  const base = "/api/v/sweeto/loyalty";
  const save = `${base}/google-wallet`;
  assert.equal((await request(`${base}/wallet`)).data.googleStatus, "requires_card");
  assert.equal((await request(save, { method: "POST" })).status, 401);
  const guest = await request(`${base}/card`, { method: "POST" });
  const owner = { cookie: guest.cookie };
  const status = (await request(`${base}/wallet`, owner)).data;
  assert.equal(status.status, "unconfigured");
  assert.equal(status.googleStatus, "ready");
  assert.equal((await request(save, { ...owner, method: "POST", origin: "https://elsewhere.test" })).status, 403);
  assert.equal((await request("/api/v/berry-counter/loyalty/google-wallet", { ...owner, method: "POST" })).status, 401);
  const berry = await request("/api/v/berry-counter/loyalty/card", { method: "POST" });
  assert.equal((await request("/api/v/berry-counter/loyalty/google-wallet", { cookie: berry.cookie, method: "POST" })).status, 503);

  const issue = () => request(save, { ...owner, method: "POST" });
  const issued = await issue();
  assert.equal(issued.status, 200);
  assert.equal(issued.cacheControl, "no-store");
  const tokenFrom = (result) => /^https:\/\/pay\.google\.com\/gp\/v\/save\/([\w.-]+)$/.exec(result.data.url)[1];
  const token = tokenFrom(issued);
  assert.ok(token.length <= 1800);
  const [header, rawClaims, signature] = token.split(".");
  assert.equal(verify("RSA-SHA256", Buffer.from(`${header}.${rawClaims}`), publicKey, Buffer.from(signature, "base64url")), true);
  const decode = (segment) => JSON.parse(Buffer.from(segment, "base64url"));
  assert.deepEqual(decode(header), { alg: "RS256", typ: "JWT" });
  const claims = decode(rawClaims);
  assert.equal(claims.iss, email);
  assert.equal(claims.aud, "google");
  assert.equal(claims.typ, "savetowallet");
  assert.ok(Number.isInteger(claims.iat));
  assert.deepEqual(claims.origins, ["https://papupay.com"]);
  const [pass] = claims.payload.loyaltyObjects;
  assert.deepEqual(pass, {
    id: `123456789012345.papupay-${walletSerial({ id: "sweeto" }, guest.data.card)}`,
    classId,
    state: "ACTIVE",
    accountId: guest.data.card.code,
    heroImage: {
      sourceUri: { uri: "https://papupay.com/assets/sweeto/wallet-matylda.jpg" },
      contentDescription: { defaultValue: { language: "pl", value: "Matylda czekoladowa w pudełku Sweeto" } },
    },
    merchantLocations: [{ latitude: 52.1720425, longitude: 21.0185431 }],
    barcode: { type: "QR_CODE", value: guest.data.card.checkout, alternateText: guest.data.card.code },
  });
  const second = decode(tokenFrom(await issue()).split(".")[1]);
  assert.equal(second.payload.loyaltyObjects[0].id, pass.id);
  assert.ok(!JSON.stringify(claims).includes(guest.cookie.split("=")[1]));
  const forest = await request("/api/v/forest-counter/loyalty/card", { method: "POST" });
  const forestPass = await request("/api/v/forest-counter/loyalty/google-wallet", { cookie: forest.cookie, method: "POST" });
  const forestObject = decode(tokenFrom(forestPass).split(".")[1]).payload.loyaltyObjects[0];
  assert.equal(forestObject.classId, "123456789012345.forest");
  assert.equal(forestObject.merchantLocations, undefined);
});

test("Wallet protocol authenticates registration and pass updates against stable per-pass identity", async (t) => {
  const passTypeId = "pass.test.papupay";
  const wallet = {
    passTypeId,
    updateOrigin: "https://wallet.example.test",
    available: async () => true,
    issue: async (_brand, card, profile) => Buffer.from(JSON.stringify({ card, profile })),
    deliver: async () => { throw new Error("This test does not send APNs requests"); },
    close() {},
  };
  const request = await start(t, { env: {}, demo: true, wallet });
  const base = "/api/v/sweeto";
  const guest = await request(base + "/loyalty/card", { method: "POST" });
  const header = { cookie: guest.cookie };
  const info = await request(base + "/loyalty/wallet", header);
  assert.equal(info.data.updatesEnabled, true);
  assert.equal(info.data.recoveryEnabled, false);
  const first = await request(info.data.passUrl, header);
  assert.equal(first.headers["Content-Type"], "application/vnd.apple.pkpass");
  assert.equal(first.data.profile.webServiceURL, "https://wallet.example.test" + base + "/wallet");
  assert.notEqual(first.data.profile.authenticationToken, guest.data.card.checkout);
  assert.equal((await request(info.data.passUrl, header)).data.profile.authenticationToken, first.data.profile.authenticationToken);

  const serial = walletSerial({ id: "sweeto" }, guest.data.card);
  const v1 = base + "/wallet/v1";
  const registrationList = `${v1}/devices/device-fixture/registrations/${passTypeId}`;
  const registration = `${registrationList}/${serial}`;
  const latest = `${v1}/passes/${passTypeId}/${serial}`;
  const credentials = { authorization: `ApplePass ${first.data.profile.authenticationToken}` };
  const registrationBody = { pushToken: "ab".repeat(32) };
  assert.equal((await request(registration, { ...header, body: registrationBody })).status, 401);
  assert.equal((await request(registration, { headers: credentials, body: registrationBody })).status, 201);
  assert.equal((await request(registration, { headers: credentials, body: registrationBody })).status, 200);
  const initial = await request(registrationList);
  assert.deepEqual(initial.data.serialNumbers, [serial]);
  assert.equal((await request(registrationList + `?passesUpdatedSince=${initial.data.lastUpdated}`)).status, 204);
  assert.equal((await request(latest, { headers: { ...credentials, "if-none-match": first.headers.ETag } })).status, 304);

  const stamp = await request(base + "/test/stamp", { ...header, body: { code: guest.data.card.checkout, actionId: randomUUID() } });
  assert.equal(stamp.data.card.stamps, 1);
  const updates = await request(registrationList + `?passesUpdatedSince=${initial.data.lastUpdated}`);
  assert.deepEqual(updates.data.serialNumbers, [serial]);
  assert(Number(updates.data.lastUpdated) > Number(initial.data.lastUpdated));
  assert.equal((await request(latest, { headers: { authorization: `ApplePass ${guest.data.card.checkout}` } })).status, 401);
  const replacement = await request(latest, { headers: credentials });
  assert.equal(replacement.data.card.stamps, 1);
  assert.notEqual(replacement.headers.ETag, first.headers.ETag);
  assert.equal((await request(registration, { headers: credentials, method: "DELETE" })).status, 200);
  assert.equal((await request(registrationList)).status, 204);
});

test("a local recovery link previews without a session, restores only on POST, and can be revoked or expire", async (t) => {
  let now = Date.now();
  const options = {
    env: { PAPUPAY_RECOVERY_SECRET: "non-production-recovery-fixture-123456789" },
    venues: [{ id: "another", name: "Another" }],
    demo: true,
    recoveryClock: () => now,
  };
  const request = await start(t, options);
  const base = "/api/v/sweeto";
  const card = await request(base + "/loyalty/card", { method: "POST" });
  assert.deepEqual((await request(base + "/test")).data, { enabled: true, recoveryEnabled: true });

  const link = await request(base + "/test/restore-link", { method: "POST", cookie: card.cookie });
  assert.equal(link.status, 200);
  assert.match(link.headers["Set-Cookie"], /Max-Age=0; HttpOnly/);
  const match = /^\/v\/sweeto\/restore#token=(.+)$/.exec(link.data.restorePath);
  assert(match);
  const token = match[1];
  const body = { token };
  assert.deepEqual((await request(base + "/test/restore-link", { method: "POST", cookie: card.cookie })).data, link.data);
  assert.equal((await request(base + "/loyalty/restore?token=" + token)).status, 404);
  assert.equal((await request("/api/v/another/loyalty/restore/preview", { body })).status, 401);
  const preview = await request(base + "/loyalty/restore/preview", { body });
  assert.deepEqual(preview.data, { code: card.data.card.code, stamps: 0, goal: 6, name: "Sweeto" });
  assert.equal(preview.cookie, undefined);
  const recovered = await request(base + "/loyalty/restore", { body });
  assert.deepEqual(recovered.data, card.data);
  assert.notEqual(recovered.cookie, card.cookie);
  assert.match(recovered.headers["Set-Cookie"], /HttpOnly; SameSite=Strict/);

  assert.equal((await request(base + "/loyalty/restore/revoke", { method: "POST", cookie: recovered.cookie })).status, 204);
  assert.equal((await request(base + "/loyalty/restore", { body })).status, 401);
  const newLink = await request(base + "/test/restore-link", { method: "POST", cookie: recovered.cookie });
  const replacement = { token: newLink.data.restorePath.split("#token=")[1] };
  assert.notEqual(replacement.token, token);
  now += 366 * 24 * 60 * 60 * 1000;
  assert.equal((await request(base + "/loyalty/restore/preview", { body: replacement })).status, 401);
  for (let attempt = 0; attempt < 11; attempt += 1) {
    assert.equal((await request(base + "/loyalty/restore/preview", { body: { token: "invalid" } })).status, 401);
  }
  assert.equal((await request(base + "/loyalty/restore/preview", { body: { token: "invalid" } })).status, 429);
});

test("an unconfigured restore service reports unavailability without changing the session", async (t) => {
  const request = await start(t, { env: {} });
  const owner = await request("/api/v/sweeto/loyalty/card", { method: "POST" });
  for (const action of ["restore/preview", "restore"]) {
    const response = await request("/api/v/sweeto/loyalty/" + action, { body: { token: "unused" }, cookie: owner.cookie });
    assert.equal(response.status, 503);
    assert.equal(response.data.error, "recovery_unavailable");
    assert.equal(response.cookie, undefined);
  }
  assert.deepEqual((await request("/api/v/sweeto/loyalty/card", { cookie: owner.cookie })).data, owner.data);
});

test("an Apple pass identity can only carry its originally issued recovery link", async (t) => {
  let now = Date.now();
  const passTypeId = "pass.test.papupay";
  const request = await start(t, {
    env: {
      PAPUPAY_RECOVERY_SECRET: "non-production-recovery-fixture-987654321",
      PAPUPAY_WALLET_RECOVERY_ORIGIN: "https://wallet.example.test",
    },
    demo: true,
    recoveryClock: () => now,
    wallet: {
      passTypeId,
      updateOrigin: "https://wallet.example.test",
      available: async () => true,
      issue: async (_brand, card, profile) => Buffer.from(JSON.stringify({ card, profile })),
      close() {},
    },
  });
  const base = "/api/v/sweeto";
  const who = await request(base + "/loyalty/card", { method: "POST" });
  const owner = { cookie: who.cookie };
  const info = await request(base + "/loyalty/wallet", owner);
  assert.equal(info.data.recoveryEnabled, true);
  const issued = await request(info.data.passUrl, owner);
  const { recoveryUrl, authenticationToken } = issued.data.profile;
  const oldToken = new URL(recoveryUrl).hash.slice("#token=".length);
  assert.equal((await request(base + "/loyalty/restore/preview", { body: { token: oldToken } })).status, 200);

  const serial = walletSerial({ id: "sweeto" }, who.data.card);
  const latestPath = `${base}/wallet/v1/passes/${passTypeId}/${serial}`;
  const updateHeaders = { authorization: `ApplePass ${authenticationToken}`, "if-none-match": issued.headers.ETag };
  await request(base + "/test/stamp", { ...owner, body: { code: who.data.card.checkout, actionId: randomUUID() } });
  const updated = await request(latestPath, { headers: updateHeaders });
  assert.equal(updated.data.card.stamps, 1);
  assert.equal(updated.data.profile.recoveryUrl, recoveryUrl);

  await request(base + "/loyalty/restore/revoke", { ...owner, method: "POST" });
  assert.equal((await request(base + "/loyalty/restore/preview", { body: { token: oldToken } })).status, 401);
  const replacement = await request(base + "/test/restore-link", { ...owner, method: "POST" });
  const newToken = replacement.data.restorePath.split("#token=")[1];
  assert.notEqual(newToken, oldToken);
  assert.equal((await request(base + "/loyalty/restore/preview", { body: { token: newToken } })).status, 200);

  const stripped = await request(latestPath, { headers: { ...updateHeaders, "if-none-match": updated.headers.ETag } });
  assert.equal(stripped.data.profile.authenticationToken, authenticationToken);
  assert.equal(stripped.data.profile.recoveryUrl, undefined);
  assert.equal((await request(info.data.passUrl, owner)).data.profile.recoveryUrl, undefined);
  assert.equal((await request(base + "/loyalty/wallet", owner)).data.recoveryEnabled, false);

  const second = await request(base + "/loyalty/card", { method: "POST" });
  const other = { cookie: second.cookie };
  assert((await request(info.data.passUrl, other)).data.profile.recoveryUrl);
  now += 366 * 24 * 60 * 60 * 1000;
  assert.equal((await request(info.data.passUrl, other)).data.profile.recoveryUrl, undefined);
});


test("production requires a persistent path for every venue", () => {
  for (const database of [undefined, ":memory:", "data/venue.sqlite"]) {
    assert.throws(() => createPapupayApi({ env: { NODE_ENV: "production" }, database }), /absolute persistent database/);
  }
});
