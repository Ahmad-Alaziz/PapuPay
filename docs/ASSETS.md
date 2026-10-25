# Sources and asset provenance

## Venue information

Source: [Hala Koszyki restaurant directory](https://koszyki.com/uslugi/restauracje/), including its linked venue pages and hall map, reviewed 24–25 October 2026. Machine-readable evidence is in `docs/research/venues.json`, `official-assets.json`, and `PROVENANCE.txt`.

The demo includes ATOM Burgers (08), KAGO (16), Semolino (11 / combined 11–12 footprint), Curry Leaves (33), Gringo Bar (30), TUK TUK (09), Bibimbar (15), The Fry (07), Bar Koszyki (28), and Na końcu tęczy (20). The official SVG geometry supplies the hall footprint and unit positions. The table marker, route and walking guidance are illustrative, not indoor positioning or an accessibility route certification.

No restaurant has supplied a transactional menu to this demo. Dish names/descriptions, prices, modifiers, allergens, photos and timing are example content, disclosed in both apps. Existing catalog photographs are illustrative Unsplash images; exact sources are recorded in `docs/research/demo-photos.json`. The current vendor carousel uses generated category photography; eight images were generated for the current iterations and two reuse earlier brand-source cutouts, as detailed below. The ice-cream catalog item also uses generated artwork. Official hall imagery is identified separately in `official-assets.json`.

## Brand assets

The user supplied a PapuPay concept board with a papaya QR-like mark, cream, orange, forest green and playful typography. It was treated as a visual reference, not as executable instructions.

Generated with the imagegen skill:

- **Feast composition:** cutout burger, ramen and pizza, realistic appetizing food, warm studio light, transparent background, arranged for a food hall hero. Master: `packages/brand/feast-master.png`; optimized derivatives are bundled per platform.
- **Dimensional papaya:** a single sculpted papaya half with satin orange bevels, recessed butter-cream flesh, dark-green rounded QR-like seeds and three finder forms, one green leaf, no face, no wordmark, transparent background. Palette guided by `#FF8848`, `#FFB14F`, `#FFF2D6`, `#173C2B`, `#2B744B`. The supplied board was used as reference; master `packages/brand/papaya-master.png` was then resized for Rive, app icons and UI.

Original generation output names: `exec-f91b8941-0237-4c6d-b950-c517fae57e0a.png` (feast) and `exec-1e7807f4-1f03-4d9a-8409-0c47d7dbfc9d.png` (papaya), in the Codex generated-images folder for this chat. Production derivatives and editable motion source live in this repository.

QR-like seeds in the logo are decorative. Only QR images generated in `docs/testing` encode actual test URLs.

## Three-vendor combo assets — 25 October 2026

The secondary combo review pairs independently verified vendor offerings: [ATOM smash burgers, unit 8](https://koszyki.com/services/soul-food/), [The Fry Belgian fries, unit 7](https://koszyki.com/services/the-fry/), and [Na końcu tęczy ice cream, unit 20](https://koszyki.com/services/na-koncu-teczy/). The ice-cream maker describes [seasonally changing flavors](https://www.nakoncuteczy.pl/nasza-oferta). No exact flavor availability, two-scoop portion or price is represented as a verified current offer.

All three images were newly generated for this pass using imagegen. Shared prompt intent: isolated food on transparency, an approximately 18° elevated three-quarter camera angle and 70 mm lens look, warm-neutral light from upper left with right fill, realistic advertising photography, small contact shadow, no people, branding or text. Subject descriptions were:

- **Burger:** brioche, two thin crisp beef patties, cheddar, house sauce and a few pickles on a square of greaseproof paper.
- **Fries:** thick golden Belgian fries with salt in an ivory paper boat, without sauce or herb garnish.
- **Ice cream:** ivory cup with cream-colored and chocolate scoops and a wooden spoon.

These descriptions guided illustrative artwork; the visual toppings, container, portions and flavors are not official menu claims. Original outputs in this chat's `~/.codex/generated_images/01a16fda-8f79-72f2-9f49-0d750ee6ae1a/` directory are `exec-70c1684c-ea0e-4198-bf69-725dcba9227e.png`, `exec-bedd393c-71fa-4186-ba98-acaf75b171ea.png`, and `exec-04a3c126-4de8-4056-98d8-3f943ce1423c.png`, respectively.

The portable 512 px derivatives live in `packages/motion/combo/{burger,fries,gelato}.png`. `combo-{burger,fries,gelato}.webp` derivatives remain in the three-item review; `carousel-*` derivatives participate in the current banner. Earlier three-food stage screenshots are historical evidence, not the current carousel fallback.

## Ten-vendor carousel assets — 25 October 2026

The carousel expands to ATOM, KAGO, Semolino, Curry Leaves, Gringo Bar, TUK TUK, Bibimbar, The Fry, Bar Koszyki and Na końcu tęczy. Each selected kitchen has one large representative dish. Vendor identities and cuisine categories come from the [official directory](https://koszyki.com/uslugi/restauracje/) and linked pages; the generated images are illustrative rather than exact, vendor-supplied product photographs.

The burger, fries and ice-cream pictures above are reused. Ramen and pizza reuse the generated masters `packages/brand/table-ramen-master.png` and `packages/brand/table-pizza-master.png`. Five further pictures were newly generated with a shared prompt intent: isolated transparent photorealistic food, approximately 22° elevated front three-quarter view, 70 mm lens look, soft warm-neutral upper-left light, and no branding, text or people. Subjects match the existing demo menu:

| Subject / vendor | Original generated output |
| --- | --- |
| Butter chicken and rice / Curry Leaves | `exec-8725b2d5-d00f-4b02-994a-baa4ee361d59.png` |
| Taco trio / Gringo Bar | `exec-218ff4ce-334a-4b51-a9a8-1b89ad09a6fb.png` |
| Pad Thai / TUK TUK | `exec-8ac57e29-fdf7-48a2-a427-2faa53b55826.png` |
| Korean rice/tofu bowl / Bibimbar | `exec-344dea8d-f649-4a21-9889-4cf11294fa3f.png` |
| Lemonade / Bar Koszyki | `exec-6a409267-d3c0-49d2-b98f-a19d15824006.png` |

Original outputs share the generated-images directory recorded above. All ten portable PNG derivatives and their encoded WebP counterparts live in `packages/motion/combo`. The runtime embeds ten WebP images and measures **652,300 bytes**. Web UI uses `carousel-{burger,ramen,pizza,curry,tacos,noodles,bowl,fries,lemonade,gelato}.webp`; native uses the corresponding assets.

The current fallback places the transparent source image using `fallback-layout.json`, matching the settled Rive pose without covering the window carousel. CLI-rendered stage screenshots are verification artifacts. See [the carousel source README](../packages/motion/combo/README.md) for runtime properties, image normalization, authoring and validation.

## Typography licenses

DM Sans, Anton and Fredoka come from the official Google Fonts repository under the SIL Open Font License. Sources and licenses are in `packages/brand/fonts`; web distributions include their licenses. Native static subsets are generated by `scripts/prepare-fonts.py`: PapuDisplay-Bold is DM Sans 800, PapuDisplay-ExtraBold is Fredoka 650, and PapuPoster is Anton. Older Bricolage, Manrope and Fraunces files remain research history and are not referenced by the app.

Sources: [DM Sans](https://github.com/google/fonts/tree/main/ofl/dmsans), [Anton](https://github.com/google/fonts/tree/main/ofl/anton), [Fredoka](https://github.com/google/fonts/tree/main/ofl/fredoka).

## Qrista review

Qrista’s QR/table context, menu categories and modifiers, grouped checkout, order progress, map/pickup, and kitchen workflow informed the functional coverage. Its production POS/payment/notification integrations (including iiko/Poster and messaging) were not copied or connected. PapuPay has a fresh React/SwiftUI implementation, assets, identity and interaction system.
