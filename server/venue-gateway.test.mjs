import assert from "node:assert/strict";
import test from "node:test";
import { forwardVenueRequest } from "./venue-gateway.mjs";

const publicOrigin = "https://papupay.test";
const privateOrigin = "https://venue.example";
const path = "/api/v/sweeto/loyalty/card";
const unused = () => assert.fail("unexpected upstream request");

test("unconfigured service, unrelated routes and cross-site mutations stay local", async () => {
  const req = new Request(publicOrigin + path);
  for (const origin of [undefined, publicOrigin, "https://user:password@venue.example"]) {
    assert.equal((await forwardVenueRequest(req, origin, unused)).status, 503);
  }
  assert.equal((await forwardVenueRequest(new Request(publicOrigin + "/api/contact"), privateOrigin, unused)).status, 404);
  for (const headers of [{ origin: "https://elsewhere.test" }, { "sec-fetch-site": "cross-site" }]) {
    const request = new Request(publicOrigin + path, { method: "POST", headers });
    assert.equal((await forwardVenueRequest(request, privateOrigin, unused)).status, 403);
  }
});

test("guest cookies, body and method reach the ledger and its session cookie returns intact", async () => {
  const request = new Request(publicOrigin + path, {
    method: "POST", body: "{}", headers: { origin: publicOrigin, "content-type": "application/json",
      cookie: "other_session=private; papupay_another_card=other; papupay_sweeto_staff=staff; papupay_sweeto_card=abc" },
  });
  const cookie = "papupay_sweeto_card=xyz; Path=/api; HttpOnly; SameSite=Strict; Secure";
  const response = await forwardVenueRequest(request, privateOrigin, async (url, init) => {
    assert.equal(url, privateOrigin + path);
    assert.equal(init.headers.get("origin"), privateOrigin);
    assert.equal(init.headers.get("cookie"), "papupay_sweeto_card=abc");
    assert.equal(init.method, "POST");
    assert.equal(await new Response(init.body).text(), "{}");
    return Response.json({ card: true }, { status: 201, headers: { "set-cookie": cookie } });
  });
  assert.equal(response.status, 201);
  assert.deepEqual(response.headers.getSetCookie(), [cookie]);
  assert.deepEqual(await response.json(), { card: true });
});

test("Wallet receives exact signed bytes, validators and empty 304 responses", async () => {
  const file = new Uint8Array([80, 75, 3, 4, 128, 255]);
  const request = new Request(publicOrigin + "/api/v/sweeto/wallet/v1/passes/type/serial", {
    headers: { authorization: "ApplePass fixture", "if-modified-since": "Mon, 20 Apr 2026 00:00:00 GMT" },
  });
  for (const status of [200, 304]) {
    const result = await forwardVenueRequest(request, privateOrigin, async (_, init) => {
      assert.equal(init.headers.get("authorization"), "ApplePass fixture");
      assert.equal(init.headers.get("if-modified-since"), request.headers.get("if-modified-since"));
      return new Response(status === 200 ? file : null, {
        status, headers: { "content-type": "application/vnd.apple.pkpass", "last-modified": "Tue, 21 Apr 2026 00:00:00 GMT" },
      });
    });
    assert.equal(result.status, status);
    assert.equal(result.headers.get("content-type"), "application/vnd.apple.pkpass");
    assert.equal(result.headers.get("cache-control"), "no-store");
    assert.deepEqual(new Uint8Array(await result.arrayBuffer()), status === 200 ? file : new Uint8Array());
  }
});


test("staff requests forward only this venue's staff session", async () => {
  const request = new Request(publicOrigin + "/api/v/sweeto/staff/session", {
    headers: { cookie: "papupay_sweeto_card=guest; papupay_sweeto_staff=cashier; papupay_cafe_staff=other" },
  });
  const result = await forwardVenueRequest(request, privateOrigin, async (_, init) => {
    assert.equal(init.headers.get("cookie"), "papupay_sweeto_staff=cashier");
    return Response.json({ authenticated: true });
  });
  assert.equal(result.status, 200);
});
