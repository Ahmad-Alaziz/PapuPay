# PapuPay motion plan

25 October 2026. Current implementation follows the user's preference for simple, purposeful movement.

## The opening

The banner demonstrates one meal assembled across three actual Hala Koszyki kitchens: **ATOM Smash Burger (08), The Fry Belgian fries (07), Na końcu tęczy ice cream (20)**. Photographic cutouts join a shared composition while curved vendor cards move into focus. Earlier dishes remain visible. The headline stays **CAŁA HALA / JEDEN KOSZYK**, with its second line in **#B7471B** on web and native.

The custom Rive artboard and state machine are both `PapuCombo`; number property `PapuComboModel.stage` selects burger (0), burger + fries (1), or the complete meal (2). The visible, active introduction advances at approximately 1.6 and 3.4 seconds, using 700 ms cubic transitions, then holds. There is no idle loop. Manual swipe or vendor tap cancels automatic progression. Hosts pause Rive while inactive and when resting; Reduced Motion and load failure show the matching exported still.

Vendor labels and controls stay outside the canvas. **Explore this combo** opens editable quantities, kitchen notes and available extras. It does not add anything automatically. **Add to basket** explicitly adds the reviewed selection and opens the grouped basket; ordering remains a separate checkout action. **All kitchens** scrolls to the ten-kitchen catalog, where cuisine filtering remains.

## Research and decisions

The following references informed the motion system. The approved combo direction takes its carousel composition from the user-selected [Kumo matcha example](https://dribbble.com/shots/26971799-Kumo-Interactive-Matcha-Tea-Landing-Page-UI-UX) and connects each movement to adding another kitchen to the meal:

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

No marketplace file was bought, copied or bundled. `PapuCombo` is an original Rive composition with newly generated food photography. The existing custom Rive journey remains in onboarding and order illustrations. Motion and SwiftUI handle UI feedback and accessible controls; no second animation runtime was added for Lottie.

## Implemented interaction plan

| Moment | Behavior | Boundary |
| --- | --- | --- |
| Discovery opens | Burger → burger + fries → complete meal, with the corresponding real vendor in focus. | Stages at approximately 0/1.6/3.4 s; each transition 700 ms, then hold. |
| Banner swipe or vendor tap | Select a composition stage and cancel the automatic sequence. | Interruptible transitions; matching still with Reduced Motion. |
| Explore this combo | Review quantities, extras and notes before explicitly adding to the basket. | No automatic cart mutation or order; zero quantity omits a dish. |
| Add a dish | Plus becomes a check immediately. On web a 48 px food image travels from its visible source to an actual visible basket, followed by a basket pulse. | 420 ms flight, 240 ms pulse; rapid input replaces the prior flight. |
| Cart success | Item, quantity, count and total remain visible in the active presentation. A persistent basket action follows transient feedback. | Understandable without motion; never hidden behind the modal. |
| Kitchen becomes ready | The whole status row changes, progress fills and the ready check draws once. | Brief transition; order timers and notifications remain real app state. |
| Live Activity changes | Timer and status preserve their content grid. | System-supported numeric/replacement transitions, no decorative loops. |
| Guided onboarding | Existing custom Rive scenes explain scan, basket, preparation and collection. Whole illustration and copy transition together. | Paused offscreen/inactive; static alternative under Reduced Motion. |

## Live Activity alignment

The Lock Screen card forced left-to-right layout but the Dynamic Island inherited the system's language direction. Every region now applies the same PL/EN locale and left-to-right direction. The Lock Screen uses consistent 14-point insets, a top-aligned description and a centered 64-point counter. Cooking and ready share the same content grid. Compact/minimal variants use bounded content and limited-width fallbacks. The actual two-kitchen ready card was inspected on the simulator; presentation-specific evidence and limitations are recorded in QA.

## Source and verification

- Banner and review: `apps/web/src/CravingHero.tsx`, `ComboMotion.tsx`, `ComboReview.tsx`, `table-hero.css`, and native discovery/review views.
- Combo Rive: `packages/motion/combo`, authored by `scripts/build-combo-motion.py`; artboard/state machine `PapuCombo`, VM `PapuComboModel.stage`. Its README records runtime validation, sources and asset provenance.
- Basket feedback: `AddGlyph.tsx`, `useBasketFlight.tsx`, native design-system controls.
- Order feedback: `OrderTicket.tsx` and native order views.
- Live Activity: `apps/ios/LiveActivity/PapuLiveActivity.swift`.
- Existing Rive journey: `packages/motion/papupay`, generated by `scripts/build-motion.py`; artboard/state machine `Papu`, VM `PapuJourney` with `scene` and `pressed`; 351,982-byte export.

The earlier table composition is archived; the shipping hero uses `PapuCombo`. Food photographs are generated category illustrations, not official vendor product images. Verification evidence remains in QA, including historical releases; current release checks must cover the combo review, all three vendors and unit 20 routing, Reduced Motion, browser interactions, native builds and the signed App Clip size gate. A successful build alone is not a claim of measured physical-device performance.
