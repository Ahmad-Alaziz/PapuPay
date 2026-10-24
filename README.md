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

The React app works on Android, iPhone, and desktop browsers. It has no login and keeps demo state in local storage. A private Site has been reserved at `https://papupay-koszyki-demo.roundswift9.chatgpt.site`, but it is **not deployed**: external source upload awaits explicit approval. The local demo is ready. See `docs/verification/QA.md`.

## Run native iOS / App Clip

Open `apps/ios/PapuPay.xcodeproj` in Xcode. Select **PapuPay** for the full app or **PapuPayClip** for the App Clip. The project contains separate Live Activity extensions for both. iOS 17+ is supported; native Liquid Glass appears on iOS 26+.

Simulator builds need no development team. Physical iPhone builds need Apple signing. The Clip scheme already supplies `_XCAppClipURL=https://papupay.example/clip?venue=koszyki&table=24` for Xcode testing. Read [the complete iPhone and QR testing guide](docs/IPHONE-TESTING.md).

## Try the complete journey

1. Open table 24, then “Jak to działa?” / “How it works” for the animated introduction. Tap the papaya for a small celebration.
2. Browse the nine restaurants, search dishes, filter cuisines or vegetarian options, and save favorites.
3. Customize a Classic Smash, add a ramen from KAGO, and open the grouped basket.
4. Place a **demo** order. There is no charge and nothing is sent to a restaurant.
5. Watch each kitchen progress, or use the demo-ready control. In native iOS, inspect the real Lock Screen Live Activity and Dynamic Island.
6. Find the pickup counter on the interactive hall map, mark a ticket collected, and try ordering it again.
7. About this demo → kitchen demo gives a second view of the same local orders. Web tabs on the same origin synchronize through local storage.

## What is included

- React + TypeScript + Vite, responsive layouts, Polish/English, accessible native HTML dialogs.
- SwiftUI app and App Clip, native tab navigation and sheets, haptics, ActivityKit / WidgetKit.
- Shared catalog and official hall geometry, nine demo kitchens, menu customization, multi-venue checkout, persisted order tickets and pickup.
- Original dimensional papaya artwork and custom Rive state machine: idle breathing, pointer response, QR scan, and celebration. Editable Rive source is included.
- Bricolage Grotesque display typography and capitalized **PapuPay** wordmark; Manrope web interface text and system text styles on iOS.
- Size gate, domain tests, source provenance, and verification notes.

## Project map

| Path | Purpose |
| --- | --- |
| `apps/web` | React browser app |
| `apps/ios` | Xcode project, shared SwiftUI, app, Clip and widgets |
| `packages/catalog` | Restaurant/menu data and hall map |
| `packages/motion/papupay` | Editable Rive CLI project |
| `packages/brand` | Master artwork and licensed font sources |
| `scripts` | Font preparation, Rive authoring, Xcode generation and size check |
| `docs` | Design decisions, test instructions, research and evidence |

```sh
npm test
npm run build
python3 scripts/check-clip-size.py /path/to/Release-iphoneos/PapuPayClip.app --json
```

## Demo boundaries

Names and unit locations come from Hala Koszyki’s official directory. Menus, prices, food photos, allergens, order times and the table marker are illustrative. This is an independent concept, not an official Hala Koszyki service. Both apps use local state, not a backend. Payments, POS dispatch, push updates, and cross-device synchronization are intentionally simulated or absent. Native Live Activities are real, with updates driven by the foreground demo app; server push is a production integration.

See [design and accessibility review](docs/DESIGN.md), [motion authorship](docs/MOTION.md), [asset provenance](docs/ASSETS.md), and [verification evidence](docs/verification/QA.md).
