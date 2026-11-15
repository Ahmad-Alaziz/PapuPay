# PapuPay landing page

Marketing site for PapuPay, one platform for restaurants, bars and cafés: digital menus with an admin dashboard and QR table stickers, a Google review link, and NFC/App Clip loyalty cards (in early access).

Built with Next.js 16 (App Router, static export), TypeScript, Tailwind CSS v4, shadcn/ui and Motion. English and Polish are served from `/en` and `/pl`.

It is deployed as part of the PapuPay repository: `next build` writes static HTML to `out/`, which the root build merges into the web app's output (see [Deploying](#deploying)).

## Getting started

From the repository root (npm workspaces):

```bash
npm ci
npm run dev:landing          # http://localhost:3000/en
```

On papupay.com, `/` redirects to `/en` or `/pl` using the `NEXT_LOCALE` cookie first (set by the language switcher), then the browser's `Accept-Language` header, and falls back to English. These redirects live in the root `vercel.json`, so open `/en` or `/pl` directly in development.

### Scripts

| Command             | What it does                    |
| ------------------- | ------------------------------- |
Run inside `apps/landing`, or from the root with `-w apps/landing`.

| Command             | What it does                        |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Start the dev server                |
| `npm run build`     | Static export to `out/`             |
| `npm run lint`      | ESLint                              |
| `npm run typecheck` | Type-check                          |

## Environment variables

| Variable               | Required | Description                                                                                           |
| ---------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `MAILJET_API_KEY`      | yes      | Mailjet API key                                                                                       |
| `MAILJET_SECRET_KEY`   | yes      | Mailjet secret key                                                                                    |
| `MAILJET_SENDER_EMAIL` | yes      | "From" address. Must be a validated sender or domain in Mailjet.                                      |
| `CONTACT_RECIPIENTS`   | yes      | Comma-separated list of addresses that receive contact form messages. Only ever read on the server.   |
| `NEXT_PUBLIC_SITE_URL` | no       | Public URL for canonical links, Open Graph, sitemap and robots. On Vercel it defaults to the production domain. |

These are read by the `api/contact` Vercel Function, so set them in the Vercel project. Never commit real values. `.env*` files are git-ignored except `.env.example`.

## Where things live

```
src/
  app/
    [lang]/            Localized root layout, page and Open Graph image
    global-not-found   404 page for unknown URLs (exported as 404.html)
    icon.svg, favicon.ico, apple-icon.png, sitemap.ts, robots.ts
  content/
    en.ts              All English copy (this file defines the shape)
    pl.ts              Polish copy (type-checked against en.ts)
    pricing.ts         Pricing tiers. Values marked PLACEHOLDER need editing.
    stats.ts           Benefit figures and chart data. Example values marked PLACEHOLDER.
  components/
    sections/          One component per page section
    contact/           Contact form (client component)
    illustrations/     Hero visual, phone and feature mockups, animated step
                       illustrations (steps/), page background shapes
    brand/logo.tsx     Papaya mark and wordmark
    motion/            Motion provider and scroll-reveal helpers
    ui/                shadcn/ui components
  i18n/                Locale config and dictionary loader
server/                Contact handler, Mailjet client and rate limiter
public/                Icons and site.webmanifest
```

The contact handler is exposed by `api/contact.ts` at the repository root.

### Editing copy

All text is in `src/content/en.ts` and `src/content/pl.ts`. Both files share one TypeScript type, so a missing or misspelled key in Polish fails `tsc`.

To add a language, add its code to `locales` in `src/i18n/config.ts`, create `src/content/<code>.ts` typed as `Dictionary`, register it in `src/i18n/dictionaries.ts` and add translations to `pricing.ts`.

### Pricing

Edit `src/content/pricing.ts`. Every value marked `PLACEHOLDER` (names, prices, currency, period, features) is a stand-in. Set `price: null` to hide the price on a tier. The third tier ("Not sure? Ask us") links to `#contact`.

## Contact form

`POST /api/contact` with JSON `{ name?, email, message, locale }`. Because the site is a static export, the handler (`server/contact.ts`) runs as a Vercel Function from the root `api/` folder, not as a Next.js route. `next dev` doesn't serve it; use `vercel dev` from the repository root to test the form locally.

- **Validation:** zod on the server. The client validates the same limits (`src/lib/contact.ts`) without shipping zod to the browser.
- **Spam protection:** a hidden honeypot field (`company_website`). When it is filled in, the handler answers with success and sends nothing.
- **Rate limiting:** 5 requests per IP per 10 minutes, kept in memory. On Vercel each serverless instance keeps its own counter. If you need a strict global limit, back `server/rate-limit.ts` with Upstash Redis or Vercel KV.
- **Sending:** Mailjet Send API v3.1. Mail goes to `CONTACT_RECIPIENTS`, with `Reply-To` set to the visitor's address. Recipients never reach the client, and visitors only see a generic success or error message. Failures are logged server-side without the message body.

## Deploying

The landing ships with the existing `papupay` Vercel project (see `docs/DEPLOYMENT.md`):

1. The root `npm run build` builds the Vite demo, then this app, then runs `scripts/merge-landing.mjs`, which copies `out/` into `apps/web/dist`. It stops if a landing file would overwrite a demo file.
2. The root `vercel.json` redirects `/` to a locale, rewrites `/en` and `/pl` to their HTML files, and serves the Open Graph images as PNG.
3. Under **Settings → Environment Variables**, add `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAILJET_SENDER_EMAIL` and `CONTACT_RECIPIENTS` for Production (and Preview if you want the form to work there). Canonical and Open Graph URLs use the production domain unless `NEXT_PUBLIC_SITE_URL` is set.
4. In Mailjet, validate the sender address or domain, and set up SPF and DKIM for the domain so messages aren't marked as spam.

## Design

Based on `design/`. Colours are Juicy Orange `#FF762F`, Dark Leaf `#173D2B`, Pale Cream `#FFF5E7` and Soft Lime `#D9EE9B`. Headings use Outfit and body text uses Manrope. The layout follows the bento-card style of `design/inspiration.png`.

Orange text on cream fails contrast, so text uses a darker papaya tone (`--papaya-ink: #B4460E`). Animations use Motion's `LazyMotion` to keep the bundle small, and respect `prefers-reduced-motion`.
