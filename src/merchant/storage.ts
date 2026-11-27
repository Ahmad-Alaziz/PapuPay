import "server-only";

// Supabase Storage over its REST API. Browsers upload straight to Storage with
// a short-lived signed URL, so files never pass through a Vercel function and
// no Supabase key reaches the browser.

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "venue-assets";
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set.");
  return { url, key, bucket };
}

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

function adminHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

/** A URL the browser can PUT one file to. Valid for two hours; can't overwrite. */
export async function createSignedUpload(path: string) {
  const { url, key, bucket } = config();
  const response = await fetch(`${url}/storage/v1/object/upload/sign/${bucket}/${encodePath(path)}`, {
    method: "POST",
    headers: { ...adminHeaders(key), "Content-Type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Storage signing failed with HTTP ${response.status}`);
  const { url: signed } = (await response.json()) as { url: string };
  return `${url}/storage/v1${signed}`;
}

/** Size and type Storage recorded for an uploaded file, or null if it isn't there. */
export async function storedObject(path: string) {
  const { url, key, bucket } = config();
  const response = await fetch(`${url}/storage/v1/object/info/${bucket}/${encodePath(path)}`, {
    headers: adminHeaders(key),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;
  const info = (await response.json()) as { size?: number; content_type?: string };
  return typeof info.size === "number" && typeof info.content_type === "string"
    ? { size: info.size, contentType: info.content_type }
    : null;
}

/** The first bytes of a stored file, to check it really is what it claims to be. */
export async function readFileStart(path: string, length = 16) {
  const { url, key, bucket } = config();
  const response = await fetch(`${url}/storage/v1/object/authenticated/${bucket}/${encodePath(path)}`, {
    headers: { ...adminHeaders(key), Range: `bytes=0-${length - 1}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;
  return new Uint8Array(await response.arrayBuffer()).slice(0, length);
}

export async function deleteStoredObject(path: string) {
  const { url, key, bucket } = config();
  await fetch(`${url}/storage/v1/object/${bucket}/${encodePath(path)}`, {
    method: "DELETE",
    headers: adminHeaders(key),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => undefined);
}

export function publicUrl(path: string) {
  const { url, bucket } = config();
  return `${url}/storage/v1/object/public/${bucket}/${encodePath(path)}`;
}

/** Checks the file signature (magic bytes) against the declared type. */
export function matchesSignature(bytes: Uint8Array, contentType: string) {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  switch (contentType) {
    case "image/png":
      return bytes[0] === 0x89 && ascii(1, 4) === "PNG";
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "application/pdf":
      return ascii(0, 5) === "%PDF-";
    default:
      return false;
  }
}
