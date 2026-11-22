import assert from "node:assert/strict";
import test from "node:test";

const origin = process.env.PAPUPAY_BASE_URL ?? "http://localhost:3000";
const request = (path, options) => fetch(new URL(path, origin), { ...options, redirect: "manual" });

test("marketing locale detection still works", async () => {
  const polish = await request("/", { headers: { "Accept-Language": "pl-PL, en;q=0.5" } });
  assert.equal(polish.status, 307);
  assert.equal(new URL(polish.headers.get("location"), origin).pathname, "/pl");

  const english = await request("/", { headers: { Cookie: "NEXT_LOCALE=en", "Accept-Language": "pl" } });
  assert.equal(english.status, 307);
  assert.equal(new URL(english.headers.get("location"), origin).pathname, "/en");

  for (const locale of ["en", "pl"]) {
    const landing = await request(`/${locale}`);
    assert.equal(landing.status, 200);
    assert.match(await landing.text(), new RegExp(`<html[^>]+lang="${locale}"`));
  }
});

test("the full app link renders directly with full-app banner metadata", async () => {
  const response = await request("/app?lang=en");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /name="apple-itunes-app" content="app-id=6826778125, app-argument=https:\/\/papupay\.com\/app"/);
  assert.match(html, /href="\/assets\/sweeto\/menu\.pdf"/);
});

test("Sweeto QR and venue links render the matching browser fallback", async () => {
  for (const [path, title] of [
    ["/go/sweeto/table", "Sweeto"],
    ["/go/sweeto/menu", "Menu Sweeto"],
    ["/go/sweeto/counter", "Karta lojalnościowa Sweeto"],
    ["/v/sweeto", "Sweeto"],
    ["/v/sweeto/reviews", "Opinie o Sweeto"],
    ["/v/sweeto/wifi", "Wi-Fi w Sweeto"],
    ["/go/maka-maslo/menu", "Menu Sweeto"],
  ]) {
    const response = await request(path, { headers: { "Accept-Language": "en" } });
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, new RegExp(`<h1[^>]*>${title}</h1>`), path);
    assert.match(html, /app-clip-bundle-id=com\.papupay\.app\.Clip/, path);
  }

  assert.equal((await request("/go/sweeto/unknown")).status, 404);
  const pdf = await request("/assets/sweeto/menu.pdf", { method: "HEAD" });
  assert.equal(pdf.status, 200);
  assert.match(pdf.headers.get("content-type"), /^application\/pdf\b/);
});

test("older app URLs redirect to /app and preserve invocation parameters", async () => {
  for (const path of ["/app.html", "/en/app", "/pl/app", "/clip", "/clip.html"]) {
    const response = await request(`${path}?lang=pl`);
    assert.equal(response.status, 308, path);
    const location = new URL(response.headers.get("location"), origin);
    assert.equal(location.pathname + location.search, "/app?lang=pl", path);
  }
});

test("Apple receives the app and App Clip association file as JSON", async () => {
  const response = await request("/.well-known/apple-app-site-association");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^application\/json\b/);
  const { appclips, applinks } = await response.json();
  assert.ok(appclips.apps.includes("5W4JVD497D.com.papupay.app.Clip"));
  const app = applinks.details.find(({ appIDs }) => appIDs.includes("5W4JVD497D.com.papupay.app"));
  for (const path of ["/app", "/go/*", "/v/*"]) {
    assert.ok(app?.components.some((component) => component["/"] === path), path);
  }
});
