# PapuPay motion plan

Updated 28 October 2026. Current implementation follows the user's preference for simple, purposeful movement.

## The opening

A large ATOM burger begins the scene. The Fry fries arrive beside it, then Na końcu tęczy ice cream joins; earlier food remains visible. Decorative windows for all ten kitchens move along a curved track behind the growing meal, with gentle spring settling. The headline stays **CAŁA HALA / JEDEN KOSZYK**, with its second line in **#B7471B** on web and native. Vendor selection and cuisine filters remain in the catalog.

The window order is ATOM, KAGO, Semolino, The Fry, Curry Leaves, Gringo Bar, Na końcu tęczy, TUK TUK, Bibimbar and Bar Koszyki. The coordinated loop follows positions `0 → 3 → 6 → 0`, then repeats. Continuous window slots preserve their identity while crossing the curved track; these are decorative views rather than selection controls.

After the scene is ready and visible, the story starts with a 2.4-second wait. The moves to positions 3 and 6 use 2.1-second springs with bounce 0.1. Fries arrive 1.35 seconds into the move to position 3; gelato arrives 1.35 seconds into the move to position 6. The first build step lasts 3.9 seconds before the next destination. The final build step lasts 5.9 seconds, allowing approximately 3.8 seconds of rest after the complete meal has settled.

The return to position 0 uses a 2.6-second spring. At 1.6 seconds into that return, Rive transitions from stage 2 to stage 0: the burger recenters and the extras leave. The reset step lasts 4.4 seconds before the next move to position 3, including approximately 1.8 seconds with the windows back at the opening position. Food and windows therefore repeat one coherent build → hold → reset story; the foreground does not remain permanently complete while the background loops.

Pause/resume controls the whole story and cancels pending window and food timers. There is no separate replay action. Offscreen and background scenes pause. Reduced Motion displays the completed stage-2 composition with still windows immediately and removes the decorative playback control.

The transparent 720 × 640 Rive artboard/state machine is `PapuCombo`. Its sole numeric input is `PapuComboModel.stage`; there is no direction input or vendor-selection state. The 750 ms food transition uses cubic easing `(0.22, 0.8, 0.2, 1)`. Host windows provide coordinated position, scale and rotation through the build and return. The Rive foreground runtime pauses once each food transition settles, then resumes for the next addition or reset.

`fallback-layout.json` supplies `stages[].foods[]`: every food in the active stage is drawn back-to-front using its normalized size and center. Loading, runtime failure and Reduced Motion use the corresponding complete transparent composition, preserving both the earlier dishes and the scenery behind them.

The single primary action, **Wybierz coś dla siebie / Explore the kitchens**, opens the catalog with filters cleared and its heading focused. The banner has no selectable vendor windows, combo builder, menu prices, cart mutation or order action. Ordering begins in the catalog.

## Research and decisions

The following references informed the motion system. The [Kumo matcha example](https://dribbble.com/shots/26971799-Kumo-Interactive-Matcha-Tea-Landing-Page-UI-UX) informed the large foreground food, curved windows and coherent depth. The current adaptation makes those windows illustrative, while successive kitchens build a complete meal:

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

No marketplace file was bought, copied or bundled. `PapuCombo` is an original Rive composition reusing three previously generated category photographs. The host windows reuse seven additional existing food images to retain all ten vendors. No new bitmap images were generated for this refinement. The existing custom Rive journey remains in onboarding and order illustrations. Motion and SwiftUI handle UI feedback and accessible controls; no second animation runtime was added for Lottie.

## Implemented interaction plan

| Moment | Behavior | Boundary |
| --- | --- | --- |
| Discovery opens | ATOM burger → add The Fry fries → add Na końcu tęczy ice cream → hold → return to burger, coordinated with the decorative vendor windows. | Start after 2.4 seconds; destination steps last 3.9, 5.9 and 4.4 seconds. Food joins at 1.35 seconds into each build move and resets at 1.6 seconds into the return. |
| Pause / resume | Pause or resume the coordinated loop, including pending food additions and reset. | Pauses offscreen/background; Reduced Motion shows the complete still without autoplay. No separate replay button. |
| Explore the kitchens | Reach the catalog, clear filters and focus its heading. | One catalog action; no vendor selector, combo builder, banner price or basket mutation. |
| Add a dish | Plus becomes a check immediately. On web a 48 px food image travels from its visible source to an actual visible basket, followed by a basket pulse. | 420 ms flight, 240 ms pulse; rapid input replaces the prior flight. |
| Cart success | Item, quantity, count and total remain visible in the active presentation. A persistent basket action follows transient feedback. | Understandable without motion; never hidden behind the modal. |
| Kitchen becomes ready | The whole status row changes, progress fills and the ready check draws once. | Brief transition; order timers and notifications remain real app state. |
| Live Activity changes | Timer and status preserve their content grid. | System-supported numeric/replacement transitions, no decorative loops. |
| Guided onboarding | Existing custom Rive scenes explain scan, basket, preparation and collection. Whole illustration and copy transition together. | Paused offscreen/inactive; static alternative under Reduced Motion. |

## Live Activity alignment

The Lock Screen card forced left-to-right layout but the Dynamic Island inherited the system's language direction. Every region now applies the same PL/EN locale and left-to-right direction. The Lock Screen uses consistent 14-point insets, a top-aligned description and a centered 64-point counter. Cooking and ready share the same content grid. Compact/minimal variants use bounded content and limited-width fallbacks. The actual two-kitchen ready card was inspected on the simulator; presentation-specific evidence and limitations are recorded in QA.

## Source and verification

- Banner: `apps/web/src/CravingHero.tsx`, `ComboMotion.tsx`, `table-hero.css`, and native discovery views.
- Meal Rive: `packages/motion/combo`, authored by `scripts/build-combo-motion.py`; artboard/state machine `PapuCombo`, VM `PapuComboModel.stage` only. The **163,181-byte** `papu-meal.riv` embeds three WebP images. Its README records scene validation and the cumulative fallback geometry contract.
- Basket feedback: `AddGlyph.tsx`, `useBasketFlight.tsx`, native design-system controls.
- Order feedback: `OrderTicket.tsx` and native order views.
- Live Activity: `apps/ios/LiveActivity/PapuLiveActivity.swift`.
- Existing Rive journey: `packages/motion/papupay`, generated by `scripts/build-motion.py`; artboard/state machine `Papu`, VM `PapuJourney` with `scene` and `pressed`; 351,982-byte export.

The earlier table composition is archived; the shipping hero uses `PapuCombo`. Food photographs are generated category illustrations, not official vendor product images. Verification evidence remains in QA, including historical releases; current release checks must cover all three cumulative stages, the smooth stage-2-to-0 reset across at least two complete cycles, coordinated vendor-window movement, pause/resume, catalog navigation without cart changes, unit 20 routing, Reduced Motion, browser interactions, native builds and the signed App Clip size gate. A successful build alone is not a claim of measured physical-device performance.
