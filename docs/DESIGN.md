# PapuPay design review — 25 October 2026

## Direction

The user's latest references are more emphatic than the original soft concept: extra-bold friendly sans headings, condensed poster lettering, paper tickets, generous food imagery and calm rounded surfaces. This pass replaces the thin editorial feeling with **DM Sans 800** for headings, **Anton** for the opening poster and counter numbers, and **Fredoka 650** for the capitalized **PapuPay** wordmark. The dimensional papaya remains the brand mark. The reference images supplied direction only; their contact details and text were not copied into the product.

Research: [Food ordering app](https://dribbble.com/shots/23147654-Food-ordering-app), [Burger & Pizza](https://dribbble.com/shots/26971353-Burger-Pizza-Food-App-UI-UX-Design), [CoCoNuts](https://dribbble.com/shots/20468519-CoCoNuts-Restaurant-App), [Gourmeat](https://www.behance.net/gallery/239040745/Gourmeat-Food-APP-UI-UX-Mobile-App-Orbix-Studio), [QuickCrave](https://www.behance.net/gallery/255115259/QuickCrave-Building-a-Bold-Food-Ordering-Experience), [Ordr](https://www.behance.net/gallery/120875341/Ordr-Food-Delivery-App-Launch-Campaign), and [Peazi](https://creativespark.co.uk/work/peazi/). Useful principles were food-first hierarchy, a recognizable typographic voice, restrained chrome and immediate action feedback. The implementation is original.

## Type and spacing

| Role | Choice |
| --- | --- |
| Brand | Fredoka 650, capital P twice; dimensional papaya |
| Hero / counter number | Anton; short uppercase phrases, never long reading text |
| Headings | DM Sans 800; 28–40 page, 21–26 card |
| Web body | DM Sans 450–650; 14–17 reading text |
| Native body | System semantic text styles and Dynamic Type |
| Page gutters | 20 mobile; 40 desktop |
| Spacing scale | 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 |
| Touch controls | 44 minimum; primary actions 52+ |
| Card shape | 22–28 radii; pills reserved for controls/status |

Native fonts are static, Polish-capable subsets. Their line metrics were normalized to remove excessive blank leading while retaining full glyph bounds for accents. Fonts and OFL licenses are self-hosted.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| Forest | #123C2D | Primary text/actions |
| Paper | #FAF6ED | Reading surfaces |
| Papaya | #FF7837 | Illustration, counter badge, active accent |
| Text orange | #B7471B | Orange text requiring contrast |
| Green | #2B744B | Ready state and secondary emphasis |
| Butter | #FFF2D6 | Pickup number and warm accents |

Bright orange carries dark text. It is not used for small orange-on-paper reading text. Ready states use both text/checkmarks and green, never color alone.

## Apple design review

Applied the requested [Apple design skill](https://github.com/dickwu/apple-design-skill/blob/main/SKILL.md), including typography, layout, motion, accessibility, notifications, Live Activities and Liquid Glass references.

| Severity | Finding → correction |
| --- | --- |
| High | Missing food-ready alert → permission-aware, OS-scheduled per-kitchen local notification, with table/order/counter context and a deep link |
| High | Notification tap restoration crash → completion-handler delegate with main-actor completion; retested successfully |
| High | Rewritten widget lacked an entry point → restored WidgetBundle and verified actual Lock Screen rendering |
| Medium | Thin/undifferentiated type → heavy DM Sans, focused Anton poster and friendly Fredoka brand |
| Medium | Title-only checkout/onboarding changes → transition each complete scene, illustration and copy together |
| Medium | Global one-second rendering → stage-boundary store changes, scoped countdowns, cached paths/formatters |
| Medium | Long demo wait → first kitchen ready after 12 seconds, all ten within 30 seconds |
| Medium | Small useful map area → food-counter focus, full-plan toggle, destination card and drawn route |
| Medium | Unclear pickup hierarchy → perforated tickets, prominent unit/order numbers and clear route/collect actions |
| Medium | Inconsistent widget colors → paper/forest card, orange cooking counter, green ready confirmation; restrained Dynamic Island on black |

Native navigation uses real system TabView/NavigationStack Liquid Glass on iOS 26+, with paper content surfaces. Web navigation is translucent CSS. Reduced Motion disables decorative Rive loops and uses simple fades/static artwork; web reduced transparency increases control opacity. The map remains native/SVG with accessible venue controls rather than embedding essential navigation in a canvas.

This is a deliberately light art direction. Exhaustive VoiceOver/Dynamic Type, physical-device frame profiling and a full semantic dark palette remain production qualification work.


## Discovery and cart clarity refinement — 25 October 2026

The discovery screen's single job is to turn a craving into an order. The current opening builds, holds and resets one meal from three real kitchens in coordination with decorative windows for all ten vendors; vendor selection and cuisine filters remain in the catalog. The brand sits directly on the page with aligned gutters. Favorites were removed to reduce competing actions. Headings omit trailing full stops; body copy keeps normal punctuation.

Visual references inspected for this pass:

- [MultiQoS Organic Food](https://dribbble.com/shots/18946486-Organic-Food-Delivery-App): one large bowl leads the composition, with secondary choices grouped around it.
- [Flexin Add to Cart](https://dribbble.com/shots/11195369-Food-App-Add-to-Cart-Animation): the purchase action becomes a clearly readable added state. PapuPay retains browsing context and offers an explicit basket action.
- [Common Foods](https://dribbble.com/shots/6955589-Add-to-Cart-Animation-Common-Foods): large product photography, a compact purchase area and visible quantity/cart changes.
- [tubik Planetono](https://dribbble.com/shots/27100942-Planetono-Preloader-Animation-for-a-Fast-Food-Chain-Website): a short entrance leads into a large food scene with directly related selection controls. PapuPay uses a nonblocking entrance without sound.

Cart success must remain understandable when all animation is disabled: item name, quantity and updated total appear with a View basket action. Feedback belongs inside the active sheet/dialog, because an outside toast can be hidden by native or HTML modal layering. A persistent basket control provides the next step without forcing a redirect after every dish. This follows the principles in Apple's `motion.md › Providing feedback` (brief, precise feedback and optional motion) and `layout.md › Visual hierarchy` (aligned, grouped content and distinct controls); the exact art direction is our design judgment.

Map labels belong to actual unit shapes and the destination card. Large floating labels were removed from the map so the drawn route remains visible end to end. An unobtrusive endpoint marks the entrance; the origin table is identified outside the route.


## Current opening — three kitchens become one meal, 28 October 2026

The opening explains the product before asking people to choose food: **ATOM (08)** contributes a burger, **The Fry (07)** adds fries, and **Na końcu tęczy (20)** adds ice cream. Each dish remains visible as the next arrives. The complete meal holds briefly, then the extras leave and the burger recenters as the windows return to the beginning. This coordinated loop communicates different kitchens in one basket, with collection at their respective counters.

The [Kumo matcha reference](https://dribbble.com/shots/26971799-Kumo-Interactive-Matcha-Tea-Landing-Page-UI-UX) informs the generous central food imagery, cream windows, curved movement and depth. All ten vendors remain in the decorative windows, whose automatic curved tour uses a light spring bounce. The windows have no vendor selection, drag gesture, prices or ordering controls. The stable **CAŁA HALA / JEDEN KOSZYK** headline uses forest then text orange **#B7471B** on both platforms.

Rive artboard/state machine `PapuCombo` uses only `PapuComboModel.stage`: `0` is burger, `1` adds fries, and `2` adds dessert. After an initial 2.4-second wait, the windows follow `0 → 3 → 6 → 0` repeatedly. The moves to The Fry and Na końcu tęczy use 2.1-second springs; each corresponding food addition starts 1.35 seconds into the move. The completed meal gets approximately 3.8 seconds at rest before the return begins. The reset takes 2.6 seconds for the windows, with food returning from stage 2 to stage 0 after 1.6 seconds: burger recenters while fries and dessert leave smoothly. After a brief burger-only hold, the next cycle builds the meal again.

Pause/resume controls the coordinated story; there is no separate replay action. Pause, offscreen visibility and backgrounding cancel pending window and food timers. Reduced Motion shows the complete stage-2 meal immediately with still windows. Loading and failure use the corresponding cumulative transparent composition from `fallback-layout.json`.

There is one primary action, **Wybierz coś dla siebie / Explore the kitchens**, leading to the ten-kitchen catalog. It clears catalog filters and brings the catalog heading into focus. The banner never mutates the basket, offers a combo builder or creates an order. Food choices, quantities, modifiers, notes and prices belong in the menu and basket. The photographs, portions and flavor presentation are illustrative; actual ice-cream flavors rotate.

The accompanying web review corrected an undersized basket stepper container, exposed active navigation to assistive technology, removed sauce modifiers from drinks/desserts, and made dish quantities respect the remaining basket-line capacity before submission. Modal dismissal delegates to app state so Escape respects checkout's busy state; catalog scrolling respects Reduced Motion.

Other feedback remains brief: plus-to-check confirmation, a small web photo-to-basket movement and coherent order-ready feedback. Live Activities share a PL/EN locale, left-to-right grid, aligned timer and bounded compact/minimal variants. See [MOTION.md](MOTION.md) for the interaction contract and [ASSETS.md](ASSETS.md) for official sources and generated image provenance. Historical review results above remain evidence of earlier passes rather than a claim of new device testing.
