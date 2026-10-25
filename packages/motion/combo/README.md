# PapuCombo — a meal across three kitchens

A custom photographic Rive composition for PapuPay's approved “Build your perfect combo” banner. A burger from ATOM is joined by fries from The Fry and gelato from Na końcu tęczy. The kitchen identities are real Koszyki vendors; the photographs are generated demo illustrations, not official vendor product photography.

## Runtime contract

| Property | Value |
| --- | --- |
| Artboard | `PapuCombo` |
| Artboard size | 720 × 560 |
| State machine | `PapuCombo` |
| View model | `PapuComboModel` |
| Number property | `stage` |
| Stage 0 | Burger |
| Stage 1 | Burger + fries |
| Stage 2 | Burger + fries + gelato |
| Background | `#123C2D` |
| Transition | 700 ms, cubic `(0.22, 0.8, 0.2, 1)` |

The host owns accessible vendor controls, localized copy, a once-only introduction, and the combo-review action. It changes `stage`; Rive interpolates the photographic positions, scale, rotation, opacity, and contact shadows. Previous dishes remain visible. There is no idle loop, audio, or script module.

Introduction: stage 0 on load, stage 1 after approximately 1.6 seconds, stage 2 after approximately 3.4 seconds of visible, active playback. Stop autoplay on user interaction and while out of view. Manual forward/backward changes work in any order and can interrupt the current transition. Reduced Motion uses the exported still for the selected stage and never autoplays.

The review action opens editable quantities, kitchen notes and available extras for all three dishes. Adding to the basket requires explicit confirmation; the banner itself never creates cart lines or orders.

Hosts use a 720 × 650 outer stage. Place the Rive artboard at y = 80, with the active vendor card centered at `(360, 85)` and neighboring cards at `(130, 58)` and `(590, 58)`. Cards are 190 × 114 artboard units. The food composition leaves the upper 120 artboard units open so cards remain readable.

## Source and output

- `scene.rml` is the editable Rive scene.
- `burger.png`, `fries.png`, and `gelato.png` are the three embedded 512 px photographic assets.
- `stage-0.png`, `stage-1.png`, and `stage-2.png` are exact Rive-rendered stills for reduced motion and runtime fallback.
- `transition-0-1.png` captures the actual transition 12 frames after a stage change.
- `build/combo.riv` is the runtime output. Copy it into each app's resources; do not ship the source or screenshots as additional Rive assets.
- `../../../scripts/build-combo-motion.py` is the reproducible scene authoring script.

## Build and validation

```sh
python3 scripts/build-combo-motion.py
rive packages/motion/combo --verify
rive inspect packages/motion/combo --summary
rive packages/motion/combo --once
rive packages/motion/combo --screenshot=packages/motion/combo/stage-0.png --data=stage=0 --advance=60
rive packages/motion/combo --screenshot=packages/motion/combo/stage-1.png --data=stage=1 --advance=60
rive packages/motion/combo --screenshot=packages/motion/combo/stage-2.png --data=stage=2 --advance=60
```

Verified with the installed Rive CLI on 25 October 2026: zero errors/warnings, 3 image assets, 3 static pose timelines, 7 transitions, 312 artboard objects, runtime output **909,006 bytes**. All three rendered stages were visually inspected. An actual `0 → 1 → 2 → 0` state-machine round trip returned pixel-identically to the initial frame. Interrupting `0 → 2` with `1` settled to the stage-1 reference with only 2 of 403,200 pixels differing due to floating-point rasterization.

The `.riv` contains no script bytecode, so it does not require script signing for the web runtime.

## Vendor and image provenance

Verified on 25 October 2026: [ATOM Burgers & Deli, unit 8](https://koszyki.com/services/soul-food/) serves smash burgers with brioche, beef, cheese and house sauce; [The Fry, unit 7](https://koszyki.com/services/the-fry/) serves fresh Belgian-style fries; [Na końcu tęczy, unit 20](https://koszyki.com/services/na-koncu-teczy/) serves own-recipe ice cream. Its [official product information](https://www.nakoncuteczy.pl/nasza-oferta) says flavors change seasonally. Portion sizes, prices and pictured flavors remain demo content.

All three food photographs were newly generated with imagegen for this composition, with a shared transparent studio-photography treatment: approximately 18° elevated three-quarter view, 70 mm lens look, soft warm-neutral upper-left light, right fill and a small contact shadow. The burger prompt described brioche, two thin beef patties, cheddar, sauce and a few pickles on greaseproof paper; fries used an unbranded ivory paper boat; ice cream used an ivory cup, cream-colored and chocolate scoops and a wooden spoon. These are generated category illustrations, not vendor-supplied photography or exact product representations.

Original output filenames and derivative locations are recorded in [ASSETS.md](../../../docs/ASSETS.md#three-vendor-combo-assets--25-october-2026). The old burger from the archived table exploration is not used in this composition.
