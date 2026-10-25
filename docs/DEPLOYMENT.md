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
| Environment variables | none for this MVP |

The root `vercel.json` supplies the build settings. Keep the root at the repository root so npm workspaces and the shared catalog remain accessible. Only the web output is hosted; the iOS project and design sources remain source files in GitHub.

The `/clip?venue=koszyki&table=24` URL serves the React demo as a web fallback. It does not register an Apple App Clip experience; Apple signing, associated domains and App Store Connect configuration are separate. See `IPHONE-TESTING.md`.

After linking GitHub, pushes to `main` deploy production; other branches can receive Vercel preview deployments according to project settings. The demo has no secrets or backend configuration. Orders persist per browser and origin, so local and hosted demos have separate demo histories.

Production URL: https://papupay.vercel.app/?table=24

Project dashboard: https://vercel.com/ahmadalazizs-projects/papupay

Initial production deployment succeeded on 25 October 2026 from commit `7c026464211c636f807decd9fad820fa1411950c`. Verified public access without authentication, a two-kitchen 82 zł demo checkout, persisted order tickets, and `/clip?venue=koszyki&table=37` rendering table 37.

The printable web QR is `docs/testing/hosted-web-table-24.png` (also supplied as SVG). It opens the hosted React demo; native App Clip association remains separate.

References: [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build), [vercel.json configuration](https://vercel.com/docs/project-configuration/vercel-json).
