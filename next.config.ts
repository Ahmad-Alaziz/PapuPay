import { existsSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  outputFileTracingIncludes: {
    "/api/\\[...venue\\]": ["./server/wallet-assets/*.png"],
  },
  outputFileTracingExcludes: {
    "/api/\\[...venue\\]": ["./build/**/*", "./.env*", "./**/*.{p8,p12}"],
  },
  env: {
    NEXT_PUBLIC_APPLE_WALLET_BADGES: ["en", "pl", "ru"]
      .filter((language) => existsSync(join(process.cwd(), "public/assets/wallet", `apple-${language}.svg`)))
      .join(","),
  },
  async redirects() {
    return ["/app.html", "/en/app", "/pl/app", "/clip", "/clip.html"].map(
      (source) => ({
        source,
        destination: "/app",
        permanent: true,
      }),
    );
  },
  async rewrites() {
    return [
      {
        source: "/go/:venue(sweeto|maka-maslo)/table",
        destination: "/v/sweeto",
      },
      {
        source: "/go/:venue(sweeto|maka-maslo)/menu",
        destination: "/v/sweeto/menu",
      },
      {
        source: "/go/:venue(sweeto|maka-maslo)/counter",
        destination: "/v/sweeto/card",
      },
      { source: "/v/maka-maslo", destination: "/v/sweeto" },
      {
        source:
          "/v/maka-maslo/:screen(menu|card|reviews|wifi|wallet|test|restore|staff)",
        destination: "/v/sweeto/:screen",
      },
      { source: "/go/:venue/table", destination: "/v/:venue" },
      { source: "/go/:venue/menu", destination: "/v/:venue/menu" },
      { source: "/go/:venue/counter", destination: "/v/:venue/card" },
    ];
  },
  async headers() {
    return [
      {
        // Apple fetches this to verify the App Clip and universal links. It has no extension, so set the type.
        source: "/.well-known/apple-app-site-association",
        headers: [
          { key: "Content-Type", value: "application/json" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
