import { NextResponse, type NextRequest } from "next/server";
import { localeCookie, locales } from "@/i18n/config";
import { negotiateLocale } from "@/i18n/negotiate";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasPrefix = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasPrefix) return;

  const locale = negotiateLocale(
    request.cookies.get(localeCookie)?.value,
    request.headers.get("accept-language"),
  );
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Keep the full app, venue invocation URLs and the merchant dashboard outside
  // the marketing locales.
  matcher: ["/((?!(?:api|app|clip|go|v|staff|dashboard)(?:/|$)|_next/|.*\\..*).*)"],
};
