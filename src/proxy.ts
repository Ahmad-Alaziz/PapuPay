import { NextResponse, type NextRequest } from "next/server";
import {
  defaultLocale,
  hasLocale,
  localeCookie,
  locales,
  type Locale,
} from "@/i18n/config";

function preferredLocale(request: NextRequest): Locale {
  const fromCookie = request.cookies.get(localeCookie)?.value;
  if (hasLocale(fromCookie)) return fromCookie;

  const header = request.headers.get("accept-language") ?? "";
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return {
        lang: tag.toLowerCase().split("-")[0],
        q: q ? Number(q.trim().slice(2)) || 0 : 1,
      };
    })
    .filter((entry) => entry.lang && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  const match = ranked.map((entry) => entry.lang).find(hasLocale);
  return match ?? defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasPrefix = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasPrefix) return;

  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API routes, Next.js internals and any path with a file extension.
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
