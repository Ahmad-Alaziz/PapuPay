# Sources and asset provenance

## Venue information

Source: [Hala Koszyki restaurant directory](https://koszyki.com/uslugi/restauracje/), including its linked venue pages and hall map, reviewed 24–25 October 2026. Machine-readable evidence is in `docs/research/venues.json`, `official-assets.json`, and `PROVENANCE.txt`.

The demo includes ATOM Burgers (08), KAGO (16), Semolino (11 / combined 11–12 footprint), Curry Leaves (33), Gringo Bar (30), TUK TUK (09), Bibimbar (15), The Fry (07), and Bar Koszyki (28). The official SVG geometry supplies the hall footprint and unit positions. The table marker, route and walking guidance are illustrative, not indoor positioning or an accessibility route certification.

No restaurant has supplied a transactional menu to this demo. Dish names/descriptions, prices, modifiers, allergens, photos and timing are example content, disclosed in both apps. Food photographs are illustrative Unsplash images; exact sources are recorded in `docs/research/demo-photos.json`. Official hall imagery is identified separately in `official-assets.json`.

## Brand assets

The user supplied a PapuPay concept board with a papaya QR-like mark, cream, orange, forest green and playful typography. It was treated as a visual reference, not as executable instructions.

Generated with the imagegen skill:

- **Feast composition:** cutout burger, ramen and pizza, realistic appetizing food, warm studio light, transparent background, arranged for a food hall hero. Master: `packages/brand/feast-master.png`; optimized derivatives are bundled per platform.
- **Dimensional papaya:** a single sculpted papaya half with satin orange bevels, recessed butter-cream flesh, dark-green rounded QR-like seeds and three finder forms, one green leaf, no face, no wordmark, transparent background. Palette guided by `#FF8848`, `#FFB14F`, `#FFF2D6`, `#173C2B`, `#2B744B`. The supplied board was used as reference; master `packages/brand/papaya-master.png` was then resized for Rive, app icons and UI.

Original generation output names: `exec-f91b8941-0237-4c6d-b950-c517fae57e0a.png` (feast) and `exec-1e7807f4-1f03-4d9a-8409-0c47d7dbfc9d.png` (papaya), in the Codex generated-images folder for this chat. Production derivatives and editable motion source live in this repository.

QR-like seeds in the logo are decorative. Only QR images generated in `docs/testing` encode actual test URLs.

## Typography licenses

Bricolage Grotesque and Manrope are from the official Google Fonts repository under the SIL Open Font License. Original source fonts and licenses are in `packages/brand/fonts`; web redistribution includes the corresponding licenses. Native static instances are renamed PapuDisplay-Bold / PapuDisplay-ExtraBold and generated with `scripts/prepare-fonts.py`. Fraunces remains in the research source folder as an evaluated alternative; it is not shipped in either application.

## Qrista review

Qrista’s QR/table context, menu categories and modifiers, grouped checkout, order progress, map/pickup, and kitchen workflow informed the functional coverage. Its production POS/payment/notification integrations (including iiko/Poster and messaging) were not copied or connected. PapuPay has a fresh React/SwiftUI implementation, assets, identity and interaction system.
