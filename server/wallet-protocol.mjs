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
  const match = /^ApplePass ([\w-]{43})$/i.exec(request.headers.get("authorization") ?? "");
  if (!record || !match || record.auth_token.length !== match[1].length
      || !timingSafeEqual(Buffer.from(record.auth_token), Buffer.from(match[1]))) {
    throw new ApiError(401, "unauthorized");
  }
}

function emptyWalletResponse(status, headers = {}) {
  return new Response(null, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function sendWalletPass(method, bytes, brand, updateHeaders = {}) {
  if (!bytes) throw new ApiError(503, "wallet_unconfigured");
  return new Response(method === "HEAD" ? null : bytes, {
    headers: {
      "Cache-Control": "no-store", "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="${brand.id}-loyalty.pkpass"`,
      "Content-Length": bytes.length, "X-Content-Type-Options": "nosniff", ...updateHeaders,
    },
  });
}

export function createWalletProtocol({ brand, store, wallet, recovery, readBody, respond }) {
  const serviceURL = wallet.updateOrigin ? new URL(`/api/v/${brand.id}/wallet`, wallet.updateOrigin).href : null;

  async function profile(card, entry) {
    return {
      recoveryUrl: entry ? await recovery.boundUrl(entry) : await recovery.url(card.checkout),
      ...(serviceURL && entry ? { webServiceURL: serviceURL, authenticationToken: entry.auth_token } : {}),
    };
  }

  const updateHeaders = (entry) => ({
    "Last-Modified": new Date(entry.updated_at).toUTCString(),
    ETag: `"v${entry.revision}"`,
  });

  return {
    async offersRecovery(card) {
      if (!recovery.origin) return false;
      if (!serviceURL || !card) return true;
      const entry = await store.pass(wallet.passTypeId, walletSerial(brand, card));
      return !entry || Boolean(await recovery.boundUrl(entry));
    },
    async issue(request, card) {
      if (!await wallet.available()) throw new ApiError(503, "wallet_unconfigured");
      if (!serviceURL) {
        return sendWalletPass(request.method, await wallet.issue(brand, card, await profile(card)), brand);
      }
      const type = wallet.passTypeId;
      const serial = walletSerial(brand, card);
      if (!await store.pass(type, serial)) {
        // Bind the recovery version with issuance. Apple retains the pass authentication token.
        await store.issue(type, serial, card.checkout, { recoveryWindow: recovery.issuanceWindow() });
      }
      const { entry, card: current } = await store.snapshot(type, serial);
      return sendWalletPass(request.method, await wallet.issue(brand, current, await profile(current, entry)), brand, updateHeaders(entry));
    },
    async handle(request, path) {
      if (!serviceURL) throw new ApiError(404, "not_found");
      if (!await wallet.available()) throw new ApiError(503, "wallet_unconfigured");

      const method = request.method;
      const parts = path.split("/").slice(4);
      if (parts.length === 1 && parts[0] === "log" && method === "POST") {
        // Apple may send personal data in diagnostics. Discard without logging.
        await request.body?.cancel().catch(() => {});
        return emptyWalletResponse(200);
      }
      if (parts[0] === "devices" && parts[2] === "registrations" && [4, 5].includes(parts.length)) {
        const device = devicePart(parts[1]);
        const type = parts[3];
        if (!device || type !== wallet.passTypeId) throw new ApiError(404, "not_found");
        if (parts.length === 4 && method === "GET") {
          const tag = new URL(request.url).searchParams.get("passesUpdatedSince");
          const since = tag === null ? 0 : Number(tag);
          if (tag !== null && (!/^\d{1,15}$/.test(tag) || !Number.isSafeInteger(since))) throw new ApiError(400, "invalid_request");
          const changes = await store.updated(type, device, since);
          return changes.length ? respond(200, {
            serialNumbers: changes.map(({ serial }) => serial), lastUpdated: String(changes.at(-1).revision),
          }) : respond(204);
        }
        if (parts.length === 5 && ["POST", "DELETE"].includes(method)) {
          const serial = parts[4];
          passAuth(request, await store.pass(type, serial));
          if (method === "DELETE") {
            await store.unregister(type, serial, device);
            return emptyWalletResponse(200);
          }
          const { pushToken } = await readBody(request);
          if (typeof pushToken !== "string" || !/^(?:[\da-f]{2}){1,512}$/i.test(pushToken)) {
            throw new ApiError(400, "invalid_request");
          }
          const created = await store.register(type, serial, device, pushToken.toLowerCase());
          return emptyWalletResponse(created ? 201 : 200);
        }
      }

      if (parts.length === 3 && parts[0] === "passes" && parts[1] === wallet.passTypeId && ["GET", "HEAD"].includes(method)) {
        const current = await store.snapshot(parts[1], parts[2]);
        passAuth(request, current?.entry);
        const { card, entry } = current;
        const headers = updateHeaders(entry);
        const date = Date.parse(request.headers.get("if-modified-since"));
        const exactVersion = request.headers.get("if-none-match");
        if (exactVersion === headers.ETag || (!exactVersion && date <= Date.now() && Date.parse(entry.updated_at) <= date)) {
          return emptyWalletResponse(304, headers);
        }
        return sendWalletPass(method, await wallet.issue(brand, card, await profile(card, entry)), brand, headers);
      }
      throw new ApiError(404, "not_found");
    },
  };
}
