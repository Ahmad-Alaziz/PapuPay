# PapuPay

**Pora na papu.** A food-hall ordering demo for Hala Koszyki: scan a table QR, mix dishes from different kitchens, check out once, and follow each pickup.

PapuPay is a new repository and implementation. Qrista was reviewed for its ordering journey; its source and integrations were not copied into this app.

## Run the web app

Requires Node 22 or newer.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite with `?table=24`. For a production preview:

```sh
npm run build
npm run preview -w apps/web -- --host 0.0.0.0 --port 4173
```

The React app works on Android, iPhone, and desktop browsers. It has no login and keeps demo state in local storage. Source repository: [Ahmad-Alaziz/PapuPay](https://github.com/Ahmad-Alaziz/PapuPay). Vercel deployment is configured at the repository root; see [deployment instructions](docs/DEPLOYMENT.md). The live demo is available at [papupay.com](https://papupay.com/go/koszyki/24), with automatic production deployments from `main`.

## Run native iOS / App Clip

Open `apps/ios/PapuPay.xcodeproj` in Xcode. Select **PapuPay** for the full app or **PapuPayClip** for the App Clip. The project contains separate Live Activity extensions for both. iOS 17+ is supported; native Liquid Glass appears on iOS 26+.

Internal TestFlight builds are distributed to the PapuPay Demo group through GitHub Actions, with cloud signing and no local Xcode sign-in. See [cloud builds](docs/CLOUD-BUILDS.md) for the latest verified release. Simulator builds need no development team. Physical iPhone builds outside TestFlight need Apple signing. The Clip scheme already supplies `_XCAppClipURL=https://papupay.com/go/koszyki/24` for Xcode testing. Read [the complete iPhone and QR testing guide](docs/IPHONE-TESTING.md).

## Try the complete journey

1. Open table 24. The opening builds one illustrative meal: an ATOM burger, then The Fry fries, then Na końcu tęczy ice cream. The complete meal holds briefly, then the fries and dessert leave as the burger recenters and the vendor windows return; the whole story repeats. All ten vendors remain in the decorative curved windows, with gentle spring movement. Pause/resume is available; Reduced Motion shows the complete meal with still windows.
2. Choose “Wybierz coś dla siebie” / “Explore the kitchens” to reach the catalog. The banner does not select a vendor, quote a price or change the basket. “Jak to działa” / “How it works” opens the guided introduction.
3. Browse the ten demo kitchens, search dishes, filter cuisines or vegetarian options, and customize a Smash Burger or add a ramen from KAGO.
4. Place a **demo** order. There is no charge and nothing is sent to a restaurant.
5. Watch each kitchen progress: the first is ready in 12 seconds, all ten within 28 seconds. Enable ready alerts at checkout. In native iOS, inspect the real Lock Screen Live Activity and Dynamic Island.
6. Find the pickup counter on the interactive hall map, mark a ticket collected, and try ordering it again.
7. About this demo → kitchen demo gives a second view of the same local orders. Web tabs on the same origin synchronize through local storage.

## What is included

- React + TypeScript + Vite, responsive layouts, Polish/English, accessible native HTML dialogs.
- SwiftUI app and App Clip, native tab navigation and sheets, haptics, ActivityKit / WidgetKit.
- Shared catalog and official hall geometry, ten demo kitchens, menu customization, multi-venue checkout, persisted order tickets and pickup.
- Rive meal illustration that builds, holds and resets in a coordinated loop, with all ten vendors retained in decorative curved windows. Gentle spring movement, pause/resume and one catalog action; ordering and customization stay in the catalog.
- Original dimensional papaya artwork and custom Rive state machine: scanner, food bag, cooking cloche and ready receipt, with pointer response. Editable Rive source is included.
- Heavy DM Sans headings, Anton poster accents and a Fredoka **PapuPay** wordmark; system text styles on iOS.
- Size gate, domain tests, source provenance, and verification notes.

## Project map

| Path | Purpose |
| --- | --- |
| `apps/web` | React browser app |
| `apps/ios` | Xcode project, shared SwiftUI, app, Clip and widgets |
| `packages/catalog` | Restaurant/menu data and hall map |
| `packages/motion/papupay` | Editable order-journey Rive project |
| `packages/motion/combo` | Three-stage Rive meal illustration, reusable food cutouts, cumulative fallback geometry and runtime contract |
| `packages/motion/table` | Archived shared-table motion exploration |
| `packages/brand` | Master artwork and licensed font sources |
| `scripts` | Font preparation, Rive authoring, Xcode generation and size check |
| `docs` | Design decisions, test instructions, research and evidence |

```sh
npm test
npm run build
python3 scripts/check-clip-size.py /path/to/Release-iphoneos/PapuPayClip.app --json
```

## Demo boundaries

Names and unit locations come from Hala Koszyki’s official directory. Menus, prices, food photos, allergens, order times and the table marker are illustrative. This is an independent concept, not an official Hala Koszyki service. Both apps use local state, not a backend. Payments, POS dispatch, push updates, and cross-device synchronization are intentionally simulated or absent. Native ready alerts are real OS-scheduled local notifications, including while the app is backgrounded. App Clips request the temporary notification entitlement. Live Activities use a finite background task for the short demo; reliable long-running production updates require server push. Browser alerts require permission and an open tab; closed-tab web push is not implemented.

See [design and accessibility review](docs/DESIGN.md), [motion authorship](docs/MOTION.md), [asset provenance](docs/ASSETS.md), and [verification evidence](docs/verification/QA.md).

## Domain and table QR links

[Coming soon](https://papupay.com/) · [Web app](https://papupay.com/app) · [Koszyki table 24](https://papupay.com/go/koszyki/24). See [domain, QR and App Clip architecture](docs/DOMAIN-AND-QR.md).
