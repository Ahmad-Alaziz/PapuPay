import { timingSafeEqual } from "node:crypto";
import { ApiError } from "./loyalty.mjs";
import { walletSerial } from "./wallet.mjs";

const devicePart = (value) => {
  try {
    const part = decodeURIComponent(value);
    return /^[\x21-\x7e]{1,256}$/.test(part) ? part : null;
  } catch { return null; }
};

function passAuth(request, record) {
  const match = /^ApplePass ([\w-]{43})$/i.exec(request.headers.authorization ?? "");
  if (!record || !match || !timingSafeEqual(Buffer.from(record.auth_token), Buffer.from(match[1]))) {
    throw new ApiError(401, "unauthorized");
  }
}

export function sendWalletPass(response, method, bytes, brand, updateHeaders = {}) {
  if (!bytes) throw new ApiError(503, "wallet_unconfigured");
  response.writeHead(200, {
    "Cache-Control": "no-store", "Content-Type": "application/vnd.apple.pkpass",
    "Content-Disposition": `attachment; filename="${brand.id}-loyalty.pkpass"`,
    "Content-Length": bytes.length, "X-Content-Type-Options": "nosniff", ...updateHeaders,
  });
  response.end(method === "HEAD" ? undefined : bytes);
}

export function createWalletProtocol({ brand, store, wallet, recovery, readBody, respond }) {
  const serviceURL = wallet.updateOrigin ? new URL(`/api/v/${brand.id}/wallet`, wallet.updateOrigin).href : null;

  function profile(card, entry) {
    return {
      recoveryUrl: entry ? recovery.boundUrl(entry) : recovery.url(card.checkout),
      ...(serviceURL && entry ? { webServiceURL: serviceURL, authenticationToken: entry.auth_token } : {}),
    };
  }

  const updateHeaders = (entry) => ({
    "Last-Modified": new Date(entry.updated_at).toUTCString(),
    ETag: `"v${entry.revision}"`,
  });

  return {
    offersRecovery(card) {
      if (!recovery.origin) return false;
      if (!serviceURL || !card) return true;
      const entry = store.pass(wallet.passTypeId, walletSerial(brand, card));
      return !entry || Boolean(recovery.boundUrl(entry));
    },
    async issue(request, response, card) {
      if (!await wallet.available()) throw new ApiError(503, "wallet_unconfigured");
      if (!serviceURL) {
        sendWalletPass(response, request.method, await wallet.issue(brand, card, profile(card)), brand);
        return;
      }
      const type = wallet.passTypeId;
      const serial = walletSerial(brand, card);
      if (!store.pass(type, serial)) {
        // Bind the recovery version once. Apple keeps this authentication token for the life of the pass.
        store.issue(type, serial, card.checkout, recovery.version(card.checkout));
      }
      const { entry, card: current } = store.snapshot(type, serial);
      sendWalletPass(response, request.method, await wallet.issue(brand, current, profile(current, entry)), brand, updateHeaders(entry));
    },
    async handle(request, response, path) {
      if (!serviceURL) throw new ApiError(404, "not_found");
      if (!await wallet.available()) throw new ApiError(503, "wallet_unconfigured");

      const method = request.method;
      const parts = path.split("/").slice(4);
      if (parts.length === 1 && parts[0] === "log" && method === "POST") {
        request.resume(); // Apple may send personal data in diagnostics. Discard them without logging.
        response.writeHead(200, { "Cache-Control": "no-store" }).end();
        return;
      }
      if (parts[0] === "devices" && parts[2] === "registrations" && [4, 5].includes(parts.length)) {
        const device = devicePart(parts[1]);
        const type = parts[3];
        if (!device || type !== wallet.passTypeId) throw new ApiError(404, "not_found");
        if (parts.length === 4 && method === "GET") {
          const tag = new URL(request.url, "https://wallet.invalid").searchParams.get("passesUpdatedSince");
          const since = tag === null ? 0 : Number(tag);
          if (tag !== null && (!/^\d{1,15}$/.test(tag) || !Number.isSafeInteger(since))) throw new ApiError(400, "invalid_request");
          const changes = store.updated(type, device, since);
          return changes.length ? respond(response, 200, {
            serialNumbers: changes.map(({ serial }) => serial), lastUpdated: String(changes.at(-1).revision),
          }) : respond(response, 204);
        }
        if (parts.length === 5 && ["POST", "DELETE"].includes(method)) {
          const serial = parts[4];
          passAuth(request, store.pass(type, serial));
          if (method === "DELETE") {
            store.unregister(type, serial, device);
            response.writeHead(200, { "Cache-Control": "no-store" }).end();
            return;
          }
          const { pushToken } = await readBody(request);
          if (typeof pushToken !== "string" || !/^(?:[\da-f]{2}){1,512}$/i.test(pushToken)) {
            throw new ApiError(400, "invalid_request");
          }
          const created = store.register(type, serial, device, pushToken.toLowerCase());
          response.writeHead(created ? 201 : 200, { "Cache-Control": "no-store" }).end();
          return;
        }
      }

      if (parts.length === 3 && parts[0] === "passes" && parts[1] === wallet.passTypeId && ["GET", "HEAD"].includes(method)) {
        const type = parts[1];
        const serial = parts[2];
        passAuth(request, store.pass(type, serial));
        const { card, entry } = store.snapshot(type, serial);
        const headers = updateHeaders(entry);
        const date = Date.parse(request.headers["if-modified-since"]);
        const exactVersion = request.headers["if-none-match"];
        if (exactVersion === headers.ETag || (!exactVersion && date <= Date.now() && Date.parse(entry.updated_at) <= date)) {
          response.writeHead(304, { "Cache-Control": "no-store", ...headers }).end();
          return;
        }
        sendWalletPass(response, method, await wallet.issue(brand, card, profile(card, entry)), brand, headers);
        return;
      }
      throw new ApiError(404, "not_found");
    },
  };
}
