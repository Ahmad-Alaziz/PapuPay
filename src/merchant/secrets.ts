import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM for venue secrets such as Wi-Fi passwords. The venue ID is bound
// in as associated data, so a ciphertext copied to another venue won't decrypt.
// Format: v1.<iv>.<auth tag>.<ciphertext>, each part base64url.

function key() {
  const configured = process.env.PAPUPAY_SECRETS_KEY;
  const bytes = configured ? Buffer.from(configured, "base64") : null;
  if (!bytes || bytes.length !== 32) throw new Error("PAPUPAY_SECRETS_KEY must be 32 random bytes, base64-encoded.");
  return bytes;
}

export function encryptSecret(plaintext: string, venueId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(venueId));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), ciphertext].map((part) => (typeof part === "string" ? part : part.toString("base64url"))).join(".");
}

export function decryptSecret(sealed: string, venueId: string) {
  const [version, iv, tag, ciphertext] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || ciphertext === undefined) throw new Error("Unknown secret format.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(venueId));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
