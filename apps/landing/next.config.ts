import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

type Redirect = Awaited<ReturnType<NonNullable<NextConfig["redirects"]>>>[number];

/**
 * The `/` language redirects from the repository's vercel.json, so `next dev` matches
 * production. Static exports can't redirect, so the production build leaves them to Vercel.
 */
function localeRedirects(): Redirect[] {
  const { redirects } = JSON.parse(readFileSync(join(process.cwd(), "../../vercel.json"), "utf8")) as {
    redirects: Redirect[];
  };
  return redirects.filter((r) => r.source === "/" && !r.has?.some((h) => h.type === "host"));
}

export default function config(phase: string): NextConfig {
  const dev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    // Static HTML in `out/`, served by Vercel. The contact form posts to the
    // `api/contact.ts` Vercel Function at the repository root.
    output: dev ? undefined : "export",
    redirects: dev ? async () => localeRedirects() : undefined,
    images: { unoptimized: true },
    // The root layout lives under [lang], so unknown URLs (404.html) need their own page.
    experimental: { globalNotFound: true },
    turbopack: {
      rules: {
        "*.css": {
          loaders: ["@tailwindcss/turbopack"],
          as: "*.css",
        },
      },
    },
  };
}
