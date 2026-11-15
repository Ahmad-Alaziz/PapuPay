function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

export const siteConfig = {
  name: "PapuPay",
  url: resolveSiteUrl().replace(/\/$/, ""),
};

export const sectionIds = {
  problem: "problem",
  features: "features",
  how: "how-it-works",
  benefits: "benefits",
  demo: "demo",
  pricing: "pricing",
  faq: "faq",
  contact: "contact",
} as const;
