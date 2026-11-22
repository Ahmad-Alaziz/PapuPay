import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  async redirects() {
    return ["/app.html", "/en/app", "/pl/app", "/clip", "/clip.html"].map((source) => ({
      source,
      destination: "/app",
      permanent: true,
    }));
  },
  async rewrites() {
    return [
      { source: "/go/:venue(sweeto|maka-maslo)/table", destination: "/v/sweeto" },
      { source: "/go/:venue(sweeto|maka-maslo)/menu", destination: "/v/sweeto/menu" },
      { source: "/go/:venue(sweeto|maka-maslo)/counter", destination: "/v/sweeto/card" },
      { source: "/v/maka-maslo", destination: "/v/sweeto" },
      {
        source: "/v/maka-maslo/:screen(menu|card|reviews|wifi)",
        destination: "/v/sweeto/:screen",
      },
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
