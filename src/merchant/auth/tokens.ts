import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** A random 256-bit token for a link or cookie, and the hash we store instead of it. */
export function newToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Tokens we issue are always 43 base64url characters; reject anything else before touching the database. */
export function isWellFormedToken(value: unknown): value is string {
  return typeof value === "string" && /^[\w-]{43}$/.test(value);
}

export const minutes = (count: number) => count * 60 * 1000;
export const days = (count: number) => count * 24 * 60 * 60 * 1000;
