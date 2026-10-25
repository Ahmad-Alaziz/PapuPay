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

The discovery screen's single job is to turn a craving into an order. The current opening demonstrates a meal assembled across three real kitchens; cuisine filters remain in the catalog. The brand sits directly on the page with aligned gutters. Favorites were removed to reduce competing actions. Headings omit trailing full stops; body copy keeps normal punctuation.

Visual references inspected for this pass:

- [MultiQoS Organic Food](https://dribbble.com/shots/18946486-Organic-Food-Delivery-App): one large bowl leads the composition, with secondary choices grouped around it.
- [Flexin Add to Cart](https://dribbble.com/shots/11195369-Food-App-Add-to-Cart-Animation): the purchase action becomes a clearly readable added state. PapuPay retains browsing context and offers an explicit basket action.
- [Common Foods](https://dribbble.com/shots/6955589-Add-to-Cart-Animation-Common-Foods): large product photography, a compact purchase area and visible quantity/cart changes.
- [tubik Planetono](https://dribbble.com/shots/27100942-Planetono-Preloader-Animation-for-a-Fast-Food-Chain-Website): a short entrance leads into a large food scene with directly related selection controls. PapuPay uses a nonblocking entrance without sound.

Cart success must remain understandable when all animation is disabled: item name, quantity and updated total appear with a View basket action. Feedback belongs inside the active sheet/dialog, because an outside toast can be hidden by native or HTML modal layering. A persistent basket control provides the next step without forcing a redirect after every dish. This follows the principles in Apple's `motion.md › Providing feedback` (brief, precise feedback and optional motion) and `layout.md › Visual hierarchy` (aligned, grouped content and distinct controls); the exact art direction is our design judgment.

Map labels belong to actual unit shapes and the destination card. Large floating labels were removed from the map so the drawn route remains visible end to end. An unobtrusive endpoint marks the entrance; the origin table is identified outside the route.


## Current opening — build a meal across kitchens

The approved banner explains PapuPay through a meal that grows: **ATOM Smash Burger (08) → The Fry fries (07) → Na końcu tęczy ice cream (20)**. These are actual Hala Koszyki vendors. The catalog now contains ten demo kitchens. Food images, portions, prices and flavor presentation are illustrative; ice-cream flavors rotate.

The user-selected [Kumo matcha carousel](https://dribbble.com/shots/26971799-Kumo-Interactive-Matcha-Tea-Landing-Page-UI-UX) informed the curved vendor cards, photographic depth and coherent transitions. PapuPay retains the preceding food as each kitchen joins, so the movement explains one basket across vendors. The stable **CAŁA HALA / JEDEN KOSZYK** headline uses forest then text orange **#B7471B** on both platforms.

Custom Rive scene `PapuCombo` moves through stages 0, 1 and 2 at approximately 0, 1.6 and 3.4 seconds while visible and active. Each 700 ms transition settles into a still composition. Swiping or tapping a vendor takes control and stops automatic progression. Reduced Motion uses the matching exported still. Vendor controls, copy and actions remain accessible native/HTML UI outside the canvas.

**Explore this combo** opens a review of all three dishes. Quantities can be changed or set to zero; kitchen notes and available extras can be edited. Only an explicit **Add to basket** adds the selection, then reveals the grouped basket. The preview itself never creates a cart line or order. **All kitchens** still leads directly to the full catalog, and the copy distinguishes ordering at the table from collecting at the counters.

Other feedback remains brief: plus-to-check confirmation, a small web photo-to-basket movement and coherent order-ready feedback. Live Activities share a PL/EN locale, left-to-right grid, aligned timer and bounded compact/minimal variants. See [MOTION.md](MOTION.md) for the interaction contract and [ASSETS.md](ASSETS.md) for official sources and generated image provenance.
