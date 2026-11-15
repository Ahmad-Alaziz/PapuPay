# GitHub and Vercel

Source: https://github.com/Ahmad-Alaziz/PapuPay

## Project settings

The repository is connected to the `papupay` project in the existing `ahmadalazizs-projects` Vercel workspace (Hobby). The root `vercel.json` supplies the build settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | repository root (`./`) |
| Framework | Other (static output) |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `apps/landing/out` |
| Node | 22.x |
| Environment variables | `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAILJET_SENDER_EMAIL`, `CONTACT_RECIPIENTS` |

Pushes to `main` deploy production at https://papupay.com/. Other branches get preview deployments.

Project dashboard: https://vercel.com/ahmadalazizs-projects/papupay

## How the site is served

`npm run build` exports the Next.js landing (`apps/landing`) as static HTML. `vercel.json` sends `/` to `/en` or `/pl` (by the `NEXT_LOCALE` cookie, then `Accept-Language`, else English) and rewrites those paths to their HTML files. The exported `404.html` is the site-wide not-found page.

The contact form posts to `api/contact.ts`, a Vercel Function that sends mail through Mailjet. Set the four variables above for Production (and Preview to test the form there); without them the form answers with a generic error. Recipients are only read on the server. See `apps/landing/README.md` and `apps/landing/.env.example`.

`www.papupay.com` redirects permanently to the same path on `papupay.com`.

## DNS

Namecheap BasicDNS remains authoritative. Only the original website parking/redirect records were changed:

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| A | @ | 216.198.79.1 | 30 min |
| CNAME | www | 2fcb2930e95c2df0.vercel-dns-017.com. | 30 min |

Vercel supplied these values for the existing `papupay` project. Email forwarding and its SPF record were preserved. Vercel manages HTTPS certificates.
