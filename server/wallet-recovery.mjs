import { createHmac, timingSafeEqual } from "node:crypto";
import { publicHttpsOrigin } from "./wallet.mjs";

const year = 365 * 24 * 60 * 60 * 1000;
const throttleWindow = 15 * 60 * 1000;
const recoveryPattern = /^([\w-]{32})\.([1-9]\d{0,14})\.([\w-]{43})$/;

export function createWalletRecovery({ env, brand, store, rateLimit, clock = Date.now }) {
  const input = env.PAPUPAY_RECOVERY_SECRET;
  const secret = typeof input === "string" && Buffer.byteLength(input) >= 32 ? input : null;
  const origin = secret ? publicHttpsOrigin(env.PAPUPAY_WALLET_RECOVERY_ORIGIN) : null;

  function signature(entry) {
    const material = JSON.stringify(["wallet-recovery", brand.id, entry.card_id, entry.reference, entry.version, entry.expires_at]);
    return createHmac("sha256", secret).update(material).digest("base64url");
  }

  function window() {
    const now = clock();
    return { now, expiresAt: now + year };
  }

  function current(checkout) {
    const { now, expiresAt } = window();
    return store.restoreLink(checkout, now, expiresAt);
  }

  function pathFor(entry) {
    const token = `${entry.reference}.${entry.version}.${signature(entry)}`;
    return `/v/${brand.id}/restore#token=${token}`;
  }

  const urlFor = (entry) => new URL(pathFor(entry), origin).href;

  async function validate(input, remote) {
    const now = clock();
    const match = typeof input === "string" ? recoveryPattern.exec(input) : null;
    const entry = match ? await store.restore(match[1]) : null;
    const valid = entry && timingSafeEqual(Buffer.from(match[3]), Buffer.from(signature(entry)))
      && entry.version === Number(match[2]) && entry.expires_at > now;
    const allowed = await rateLimit("recovery", remote ?? "unknown", Boolean(valid), { limit: 12, windowMs: throttleWindow, now });
    return allowed ? { entry: valid ? entry : null } : { limited: true };
  }

  return {
    enabled: Boolean(secret),
    origin,
    issuanceWindow: () => origin ? window() : undefined,
    url: async (checkout) => origin ? urlFor(await current(checkout)) : undefined,
    async boundUrl(pass) {
      if (!origin || pass.recovery_version === null) return undefined;
      const entry = await store.restoreBound(pass.card_id, pass.recovery_version);
      return entry && entry.expires_at > clock() ? urlFor(entry) : undefined;
    },
    path: async (checkout) => pathFor(await current(checkout)),
    validate,
  };
}
