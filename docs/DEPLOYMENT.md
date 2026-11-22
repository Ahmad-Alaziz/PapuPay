# GitHub and Vercel

Source: https://github.com/Ahmad-Alaziz/PapuPay

## Project settings

The repository is connected to the `papupay` project in the existing `ahmadalazizs-projects` Vercel workspace (Hobby). The root `vercel.json` supplies the build settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | repository root (`./`) |
| Framework | Next.js |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `.next` |
| Node | 22.x |
| Environment variables | `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAILJET_SENDER_EMAIL`, `CONTACT_RECIPIENTS` |

Pushes to `main` deploy production at https://papupay.com/. Other branches get preview deployments.

Project dashboard: https://vercel.com/ahmadalazizs-projects/papupay

## How the site is served

This is a standard Next.js deployment. `src/proxy.ts` sends `/` to `/en` or `/pl` (by the `NEXT_LOCALE` cookie, then `Accept-Language`, else English). The contact form posts to the `/api/contact` route, which sends mail through Mailjet. Set the four variables above for Production (and Preview to test the form there); without them the form answers with a generic error. Recipients are only read on the server. See `README.md` and `.env.example`.

`www.papupay.com` redirects permanently to the same path on `papupay.com`.

## App Clip

`public/.well-known/apple-app-site-association` associates `papupay.com` with the App Clip (`5W4JVD497D.com.papupay.app.Clip`) and lists `/app`, `/go/*` and `/v/*` for the installed full app. `next.config.ts` serves it as `application/json`. These URLs bypass the marketing locale redirect.

`/app` is the full app link. The Sweeto table, menu and counter links keep their original URLs and show a browser page with the bundled menu PDF and Google review link. The venue pages include Smart App Banner metadata for the App Clip. Public invocation requires a released App Store experience. The [offline loyalty walkthrough](NATIVE-DEMO.md) uses the internal TestFlight build.

Sweeto's images, menu PDF and Rive file are served from `/assets/sweeto/` and also bundled into the iOS app.

Run `npm run test:routes` against a running local build. Set `PAPUPAY_BASE_URL=https://papupay.com` to run the same checks against production.

## Skipped deploys

`ignoreCommand` in `vercel.json` skips a deployment when the latest commit changes nothing outside `apps/ios`, `packages`, `scripts`, `.github` and `docs`.

## DNS

Namecheap BasicDNS remains authoritative. Only the original website parking/redirect records were changed:

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| A | @ | 216.198.79.1 | 30 min |
| CNAME | www | 2fcb2930e95c2df0.vercel-dns-017.com. | 30 min |

Vercel supplied these values for the existing `papupay` project. Email forwarding and its SPF record were preserved. Vercel manages HTTPS certificates.
