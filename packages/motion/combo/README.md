# PapuCombo — the Koszyki vendor carousel

A custom photographic Rive foreground for PapuPay's vendor carousel. One generously sized dish takes centre stage while the host app moves the kitchen windows around it. The kitchen identities are real Koszyki vendors; the food pictures are generated demo illustrations, not official vendor product photography.

## Runtime contract

| Property | Value |
| --- | --- |
| Artboard | `PapuCombo` |
| Artboard size | 720 × 640 |
| State machine | `PapuCombo` |
| View model | `PapuComboModel` |
| Number property `stage` | Selected vendor, `0` through `9` |
| Number property `direction` | `1`: next, incoming dish from right; `-1`: previous, incoming dish from left |
| Background | Transparent |
| Arrival | 700 ms, cubic `(0.22, 0.8, 0.2, 1)` |
| Departure | 280 ms, cubic `(0.2, 0.8, 0.2, 1)` |

Set `direction` before `stage`. The host owns accessible vendor windows, localization, drag handling, autoplay and the menu action. Rive owns the dish's directional translation, scale, small ground-pivot rotation, opacity and contact shadow. At rest there is one dish; there is no idle loop, audio or runtime script.

| Stage | Vendor ID | Kitchen | Source picture |
| --- | --- | --- | --- |
| 0 | `atom` | ATOM | `burger.png` |
| 1 | `kago` | KAGO | `ramen.png` |
| 2 | `semolino` | Semolino | `pizza.png` |
| 3 | `curry` | Curry Leaves | `curry.png` |
| 4 | `gringo` | Gringo Bar | `tacos.png` |
| 5 | `tuktuk` | Tuk Tuk | `noodles.png` |
| 6 | `bibimbar` | BIBIMBAR | `bowl.png` |
| 7 | `fry` | The Fry | `fries.png` |
| 8 | `bar` | Bar Koszyki | `lemonade.png` |
| 9 | `tecza` | Na końcu tęczy | `gelato.png` |

The host can keep an unbounded carousel position and reduce it modulo 10 for `stage`. The introductory route `0 → -1 → 2 → 0` therefore sends stages `0 → 9 → 2 → 0`, with directions `-1`, `1`, `-1`. The host may sweep through several windows while Rive introduces only the destination dish. Stop autoplay on user interaction and when out of view.

## Placement and reduced motion

The foreground artboard occupies the host's 720 × 640 composition directly. Its transparent background lets native/DOM kitchen windows remain visible behind the food. Each picture is normalized by its visible alpha bounds to fit within **500 × 440** artboard units, centered at x = 360 with its contact point at y = 570. Taller drinks remain narrower rather than stretching.

`fallback-layout.json` provides exact image width, height and center coordinates for each transparent source image. Multiply those values by the host stage width divided by 720. Use this same geometry for Reduced Motion, initial loading and runtime failure; the static food then matches the settled Rive frame. Do not use an opaque screenshot as the production fallback, because it would hide the kitchen windows.

The CLI's `carousel-stage-*.png` and transition captures include the CLI preview background. They are verification evidence only.

## Authoring and output

- `scene.rml` is the editable Rive scene.
- The ten 512 px PNG files are source photographs.
- The corresponding WebP files are the embedded runtime assets, encoded with `cwebp -q 86 -alpha_q 92`.
- `build/combo.riv` is the runtime output. Apps can ship it as `papu-carousel.riv` while retaining the artboard and view-model names above.
- `../../../scripts/build-combo-motion.py` reproduces the scene, image encoding and fallback metrics using Python's standard library plus `cwebp`.

```sh
python3 scripts/build-combo-motion.py
rive packages/motion/combo --verify
rive inspect packages/motion/combo --summary
rive packages/motion/combo --once
rive packages/motion/combo --screenshot=packages/motion/combo/carousel-stage-0.png --data=stage=0 --advance=60
rive packages/motion/combo --screenshot=packages/motion/combo/carousel-backward-mid.png --advance=60 --data=direction=-1 --data=stage=9 --advance=12
```

## Validation

Verified with the installed Rive CLI on 25 October 2026: zero errors/warnings, ten embedded WebP images, ten independent dish layers, fifty pose timelines, 1,993 artboard objects. Runtime output is **652,300 bytes**.

All ten selected dishes and early/intermediate directional frames were rendered and visually inspected. A dedicated 300 ms exit gate allows the complete outgoing blend to finish before its invisible preparation pose resets. A real `0 → 9 → 2 → 0` round trip returns pixel-identically to the initial frame; reversing `0 → 9` after eight frames and selecting `0` also settles pixel-identically. Every active picture stays within the artboard. The `.riv` has no script bytecode and needs no script signing for the web runtime.
