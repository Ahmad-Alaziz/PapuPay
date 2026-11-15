# GitHub and Vercel

Source: https://github.com/Ahmad-Alaziz/PapuPay

## Project settings

The repository is connected to the `papupay` project in the existing `ahmadalazizs-projects` Vercel workspace (Hobby). Settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | repository root (`./`) |
| Framework | Vite |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `apps/web/dist` |
| Node | 22.x |
| Environment variables | `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAILJET_SENDER_EMAIL`, `CONTACT_RECIPIENTS` (landing contact form) |

The root `vercel.json` supplies the build settings. Keep the root at the repository root so npm workspaces and the shared catalog remain accessible. Only the web output is hosted; the iOS project and design sources remain source files in GitHub.

## Landing page

`npm run build` builds the Vite demo, then the Next.js landing (`apps/landing`, static export), then `scripts/merge-landing.mjs` copies the landing's `out/` into `apps/web/dist`. The merge fails rather than overwrite a demo file. `vercel.json` sends `/` to `/en` or `/pl` (by the `NEXT_LOCALE` cookie, then `Accept-Language`, else English) and rewrites those paths to their HTML files. The landing's `404.html` becomes the site-wide not-found page.

The contact form posts to `api/contact.ts`, a Vercel Function at the repository root that sends mail through Mailjet. Set the four variables above in the Vercel project for Production (and Preview to test the form there); without them the form answers with a generic error. Recipients are only read on the server. See `apps/landing/README.md` and `apps/landing/.env.example`.

The `/clip?venue=koszyki&table=24` URL serves the React demo as a web fallback. It does not register an Apple App Clip experience; Apple signing, associated domains and App Store Connect configuration are separate. See `IPHONE-TESTING.md`.

After linking GitHub, pushes to `main` deploy production; other branches can receive Vercel preview deployments according to project settings. The ordering demo has no secrets or backend configuration. Orders persist per browser and origin, so local and hosted demos have separate demo histories.

Production domain: https://papupay.com/

Ordering demo: https://papupay.com/go/koszyki/24

The original https://papupay.vercel.app/?table=24 link still works.

Project dashboard: https://vercel.com/ahmadalazizs-projects/papupay

Initial production deployment succeeded on 25 October 2026 from commit `7c026464211c636f807decd9fad820fa1411950c`. Verified public access without authentication, a two-kitchen 82 zł demo checkout, persisted order tickets, and `/clip?venue=koszyki&table=37` rendering table 37.

The canonical printed QR is `docs/testing/koszyki-table-24.png` (also supplied as SVG). Its URL is prepared for both the web demo and the native App Clip. See `DOMAIN-AND-QR.md` for DNS, routing and Apple activation status.

References: [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build), [vercel.json configuration](https://vercel.com/docs/project-configuration/vercel-json).
