import { savedDemoFragment } from "./saved-demo-card";

export type RecoveryLink =
  | { kind: "live"; token: string }
  | { kind: "demo"; stamps: number }
  | { kind: "savedDemo" };

// Only links produced by the Wallet issuers are valid. A demo snapshot has no
// membership authority, including when someone edits its public stamp count.
export function parseRecoveryLink(pathname: string, hash: string): RecoveryLink | null {
  if (!/^\/v\/[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?\/restore\/?$/.test(pathname)) return null;
  const live = /^#token=([\w-]{32}\.[1-9]\d{0,14}\.[\w-]{43})$/.exec(hash);
  if (live && live[0] === hash) return { kind: "live", token: live[1] };
  if (pathname === "/v/sweeto/restore" && hash === savedDemoFragment) return { kind: "savedDemo" };
  const demo = /^#demo=sweeto-testflight-v1\.([0-6])$/.exec(hash);
  return pathname === "/v/sweeto/restore" && demo && demo[0] === hash
    ? { kind: "demo", stamps: Number(demo[1]) }
    : null;
}
