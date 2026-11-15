import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML in `out/`, merged into the Vite demo's output by
  // `scripts/merge-landing.mjs` at the repository root. The contact form posts to the
  // `api/contact.ts` Vercel Function, and the `/` locale redirect lives in `vercel.json`.
  output: "export",
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

export default nextConfig;
