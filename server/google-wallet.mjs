import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { publicHttpsOrigin, walletSerial } from "./wallet.mjs";

const classPattern = /^([1-9]\d{0,29})\.[a-z0-9._-]{1,100}$/i;
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

function signingMaterial(path) {
  if (!path) return null;
  try {
    const account = JSON.parse(readFileSync(path, "utf8"));
    if (account.type !== "service_account" || typeof account.client_email !== "string"
      || !/^[\w.+-]+@[\w.-]+\.gserviceaccount\.com$/i.test(account.client_email)) return null;
    const key = createPrivateKey(account.private_key);
    if (key.asymmetricKeyType !== "rsa" || key.asymmetricKeyDetails.modulusLength < 2048) return null;
    return { key, email: account.client_email };
  } catch {
    return null;
  }
}

export function createGoogleWalletSigner(env) {
  const origin = publicHttpsOrigin(env.PAPUPAY_GOOGLE_WALLET_ORIGIN ?? "https://papupay.com");
  const material = signingMaterial(env.PAPUPAY_GOOGLE_WALLET_SERVICE_ACCOUNT_PATH);

  return {
    available(classId) {
      return Boolean(origin && material && classPattern.test(classId ?? ""));
    },
    issue(classId, brand, card) {
      const issuer = typeof classId === "string" && classPattern.exec(classId)?.[1];
      if (!origin || !material || !issuer) return null;

      const claims = {
        iss: material.email,
        aud: "google",
        typ: "savetowallet",
        iat: Math.floor(Date.now() / 1000),
        origins: [origin],
        payload: {
          loyaltyObjects: [{
            id: `${issuer}.papupay-${walletSerial(brand, card)}`,
            classId,
            state: "ACTIVE",
            accountId: card.code,
            ...(brand.walletLocation ? { merchantLocations: [brand.walletLocation] } : {}),
            barcode: { type: "QR_CODE", value: card.checkout, alternateText: card.code },
          }],
        },
      };
      // The card is a reusable checkout identity. Omitting the balance keeps the pass accurate without a sync service.
      const content = `${encode({ alg: "RS256", typ: "JWT" })}.${encode(claims)}`;
      const jwt = `${content}.${sign("RSA-SHA256", Buffer.from(content), material.key).toString("base64url")}`;
      return jwt.length <= 1800 ? `https://pay.google.com/gp/v/save/${jwt}` : null;
    },
  };
}
