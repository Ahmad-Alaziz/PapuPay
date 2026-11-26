import { createHmac, timingSafeEqual } from "node:crypto";
import { publicHttpsOrigin } from "./wallet.mjs";

const year = 365 * 24 * 60 * 60 * 1000;
const throttleWindow = 15 * 60 * 1000;
const recoveryPattern = /^([\w-]{32})\.([1-9]\d{0,14})\.([\w-]{43})$/;

export function createWalletRecovery({ env, brand, store, clock = Date.now }) {
  const input = env.PAPUPAY_RECOVERY_SECRET;
  const secret = typeof input === "string" && Buffer.byteLength(input) >= 32 ? input : null;
  const origin = secret ? publicHttpsOrigin(env.PAPUPAY_WALLET_RECOVERY_ORIGIN) : null;
  const failures = new Map();

  function signature(entry) {
    const material = JSON.stringify(["wallet-recovery", brand.id, entry.card_id, entry.reference, entry.version, entry.expires_at]);
    return createHmac("sha256", secret).update(material).digest("base64url");
  }

  function current(checkout) {
    const now = clock();
    return store.restoreLink(checkout, now, now + year);
  }

  function pathFor(entry) {
    const token = `${entry.reference}.${entry.version}.${signature(entry)}`;
    return `/v/${brand.id}/restore#token=${token}`;
  }

  const urlFor = (entry) => new URL(pathFor(entry), origin).href;

  function validate(input, remote) {
    const now = clock();
    for (const [key, value] of failures) {
      if (value.expires <= now) failures.delete(key);
    }
    const key = remote ?? "unknown";
    const failure = failures.get(key);
    if (failure?.count >= 12 || (!failure && failures.size >= 4096)) return { limited: true };

    const match = typeof input === "string" ? recoveryPattern.exec(input) : null;
    const entry = match ? store.restore(match[1]) : null;
    const valid = entry && timingSafeEqual(Buffer.from(match[3]), Buffer.from(signature(entry)))
      && entry.version === Number(match[2]) && entry.expires_at > now;
    if (valid) {
      failures.delete(key);
      return { entry };
    }

    failures.set(key, { count: (failure?.count ?? 0) + 1, expires: failure?.expires ?? now + throttleWindow });
    return { entry: null };
  }

  return {
    enabled: Boolean(secret),
    origin,
    version: (checkout) => origin ? current(checkout).version : null,
    url: (checkout) => origin ? urlFor(current(checkout)) : undefined,
    boundUrl(pass) {
      if (!origin || pass.recovery_version === null) return undefined;
      const entry = store.restoreBound(pass.card_id, pass.recovery_version);
      return entry && entry.expires_at > clock() ? urlFor(entry) : undefined;
    },
    path: (checkout) => pathFor(current(checkout)),
    validate,
  };
}
