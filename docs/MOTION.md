# PapuPay motion plan

25 October 2026. Current implementation follows the user's preference for simple, purposeful movement.

## The opening

The person has already scanned a food-hall table. The opening should establish the place, explain ordering across kitchens, and offer an immediate next step. It uses the existing authentic Hala Koszyki `hall-detail` photograph, a stable **CAŁA HALA / JEDEN KOSZYK** headline, a short pickup explanation and **Explore kitchens / How it works** actions. Cuisine filtering remains in the catalog.

The photograph fades in over 500 ms and settles from 1.025× to 1× over 650 ms on web; native uses a similarly small 1.02×/500 ms entrance. The picture then stays still. Reduced Motion shows it immediately. No hero canvas, recurring animation, replay button or animation runtime is required. This keeps the scene grounded in the actual visit. The second headline line uses text orange **#B7471B** on both platforms.

## Research and decisions

The following references were inspected to understand the options before selecting the restrained implementation:

| Reference | Useful principle |
| --- | --- |
| [Rive: Receipt for payment](https://rive.app/marketplace/27480-51935-receipt-for-payment/) | A print/extend/release sequence can explain a transaction. Successive moving preview frames were inspected. Such a large narrative is unnecessary before ordering. |
| [Rive: Parallax Forest Scene](https://rive.app/marketplace/4826-9771-parallax-forest-scene/) | Separate depth layers can react coherently to input. The live input controls were inspected. Pointer or device parallax would add little to this opening. |
| [Rive: Burger Layers](https://rive.app/marketplace/22436-42005-burger-layers/) | The creator connects one action to revealing ingredient layers. Page, composition and controls were inspected; creator-described behavior is not claimed as our own runtime verification. |
| [Rive: Target Dog Delivery](https://rive.app/marketplace/19049-36033-target-dog-delivery-button-interaction/) | A two-stage button can carry a playful narrative. PapuPay keeps this kind of expression limited to the guided demo, where it explains a step. |
| [Rive: Burger café simulator](https://rive.app/marketplace/25302-47220-burger-cafe-simulator/) | Component/data-binding states can connect artwork to app state. Game-like interactions would compete with ordering here. |
| [LottieFiles: Preparing Food](https://lottiefiles.com/free-animation/preparing-food-nIU3mvESuC) | A recognizable preparation gesture explains waiting. The live pan/ingredient preview was inspected. Actual order status and remaining time stay readable text. |
| [LottieFiles: Add to Cart](https://lottiefiles.com/free-animation/add-to-cart-RSqPHjJylk) | A changing action icon can confirm the result. The live cart preview was inspected. PapuPay uses an immediate plus-to-check change and a small basket response. |
| [LottieFiles: Food App Micro-interactions](https://lottiefiles.com/marketplace/food-app-micro-interactions-animation-pack_75974) | Received, preparing, added and ready deserve distinct feedback. Unrelated delivery vehicles do not belong in a pickup product. |
| [Apple: Motion](https://developer.apple.com/design/human-interface-guidelines/motion) and [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback) | Keep feedback brief, tied to the action and optional, with text or haptics as alternatives. |
| [Apple: Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities) | Consistent margins, bounded compact/minimal layouts and state transitions help glanceability. |
| [Motion: Accessibility](https://motion.dev/docs/react-accessibility) | Reduced Motion can preserve simple opacity feedback while removing large transforms and parallax. |

No marketplace file was bought, copied or bundled. Research informed the principles; the final art direction is a design judgment shaped by the user's preference. The installed Rive runtime remains useful for the existing guided journey and order illustration. Motion and SwiftUI already provide the precise UI feedback needed; adding a second runtime for Lottie would not improve the chosen behavior.

## Implemented interaction plan

| Moment | Behavior | Boundary |
| --- | --- | --- |
| Discovery opens | Real venue photograph has one small entrance, then stays still. Copy and browse action remain stable. | 500–650 ms, no action waits. |
| Add a dish | Plus becomes a check immediately. On web a 48 px food image travels from its visible source to an actual visible basket, followed by a basket pulse. | 420 ms flight, 240 ms pulse; rapid input replaces the prior flight. |
| Cart success | Item, quantity, count and total remain visible in the active presentation. A persistent basket action follows transient feedback. | Understandable without motion; never hidden behind the modal. |
| Kitchen becomes ready | The whole status row changes, progress fills and the ready check draws once. | Brief transition; order timers and notifications remain real app state. |
| Live Activity changes | Timer and status preserve their content grid. | System-supported numeric/replacement transitions, no decorative loops. |
| Guided onboarding | Existing custom Rive scenes explain scan, basket, preparation and collection. Whole illustration and copy transition together. | Paused offscreen/inactive; static alternative under Reduced Motion. |

## Live Activity alignment

The Lock Screen card forced left-to-right layout but the Dynamic Island inherited the system's language direction. Every region now applies the same PL/EN locale and left-to-right direction. The Lock Screen uses consistent 14-point insets, a top-aligned description and a centered 64-point counter. Cooking and ready share the same content grid. Compact/minimal variants use bounded content and limited-width fallbacks. The actual two-kitchen ready card was inspected on the simulator; presentation-specific evidence and limitations are recorded in QA.

## Source and verification

- Banner: `apps/web/src/CravingHero.tsx`, `table-hero.css`, native `RootView.swift`.
- Basket feedback: `AddGlyph.tsx`, `useBasketFlight.tsx`, native design-system controls.
- Order feedback: `OrderTicket.tsx` and native order views.
- Live Activity: `apps/ios/LiveActivity/PapuLiveActivity.swift`.
- Existing Rive journey: `packages/motion/papupay`, generated by `scripts/build-motion.py`; artboard/state machine `Papu`, VM `PapuJourney` with `scene` and `pressed`; 351,982-byte export.

The unused large hero Rive runtime file, its wrapper and hero-only native images are removed from the app bundle. Editable earlier artwork remains outside the shipping path. Verification includes production compilation, existing ordering/routing tests, real browser interactions, native compilation, simulator inspection and signed App Clip size checks. A successful build alone is not a claim of measured physical-device performance.
