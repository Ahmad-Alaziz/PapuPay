# PapuPay

PapuPay gives restaurants, bars and cafés one table sticker (NFC + QR) and one dashboard behind it: a digital menu, a Google review link and loyalty cards. This repository holds the marketing site at [papupay.com](https://papupay.com/).

## Run it

Requires Node 22 or newer.

```sh
npm ci
npm run dev        # http://localhost:4173 (redirects to /en or /pl)
```

| Command             | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Dev server on port 4173                        |
| `npm run build`     | Static export to `apps/landing/out`            |
| `npm run lint`      | ESLint                                         |
| `npm run typecheck` | Type-check                                     |

## Project map

| Path | Purpose |
| --- | --- |
| `apps/landing` | The landing page (Next.js, static export). Copy, pricing and structure are described in [its README](apps/landing/README.md). |
| `api/contact.ts` | Vercel Function behind the contact form (Mailjet) |
| `vercel.json` | Build settings, `/` language redirect, headers |
| `docs/DEPLOYMENT.md` | Vercel project, environment variables, domain and DNS |
