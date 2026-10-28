# PapuCombo — three kitchens, one meal

An illustrative Rive banner showing PapuPay's central idea: a main dish from ATOM, a side from The Fry, and dessert from Na końcu tęczy become one meal. Earlier food stays visible as the next kitchen contributes. The host's kitchen windows are decorative storytelling, not a vendor selector or an ordering control.

These are real Koszyki kitchen identities. The food pictures are generated demo illustrations, not official vendor product photography.

## Runtime contract

| Property | Value |
| --- | --- |
| Artboard | `PapuCombo` |
| State machine | `PapuCombo` |
| View model | `PapuComboModel` |
| Artboard size | 720 × 640 |
| Number property | `stage` |
| Stage 0 | ATOM burger |
| Stage 1 | Burger + The Fry fries |
| Stage 2 | Burger + fries + Na końcu tęczy gelato |
| Background | Transparent |
| Transition | 750 ms, cubic `(0.22, 0.8, 0.2, 1)` |

There is no direction property. Set `stage` to 0, 1, or 2. The host coordinates a repeating meal story with all ten decorative kitchen windows. Rive moves and scales the composition, holds the completed meal, and then returns to the single burger for the next cycle. The burger remains visible throughout; fries stay visible when dessert is added. On reset, fries and gelato move out and fade together while the same burger enlarges and recenters. The Rive foreground has no internal idle loop, audio, pointer listener or runtime script, and its playback pauses after each transition.

After an initial 2.4-second hold, the host repeats window targets `[3, 6, 0]`. All ten windows remain on the decorative track; the target numbers describe its movement rather than vendor-selection controls. Each forward window move uses a 2.1-second spring with 0.1 bounce. The return to target 0 takes 2.6 seconds.

| Story step | Window target | Foreground change after movement starts | Next movement starts |
| --- | --- | --- | --- |
| Add The Fry fries | 3 | Set `stage` to 1 at 1.35 s | After 3.9 s: 2.1 s movement + 1.8 s hold |
| Add Na końcu tęczy dessert | 6 | Set `stage` to 2 at 1.35 s | After 5.9 s: 2.1 s movement + 3.8 s completed-meal hold |
| Return to ATOM burger | 0 | Set `stage` to 0 at 1.6 s | After 4.4 s: 2.6 s movement + 1.8 s burger hold |

The foreground's existing 750 ms transitions provide the additions and reset. Resetting both the windows and the food makes the next loop a complete story again. The host provides one catalog CTA and a pause/resume control for the illustration. There are no vendor-selection, menu, cart or combo-review controls in the banner, and the illustration never adds anything to the real basket. Pause/resume cancels pending food and window timers; motion also pauses when out of view or in the background. Reduced Motion displays the complete stage-2 composition immediately without autoplaying the story.

## Composition and fallback

The foreground occupies the host's 720 × 640 stage. The initial burger has a visible width of 500 units. It remains prominent at 420 units when fries arrive and at 380 units when dessert joins. Fries sit slightly behind the burger so they do not cover its face; gelato occupies the foreground on the right. The final three dishes form one readable composition.

`fallback-layout.json` contains `stages`, each with a complete `foods` array. Draw **every food** in the selected stage, in the supplied back-to-front order. Each item includes `file`, `imageWidth`, `imageHeight`, `centerX` and `centerY`. Multiply all dimensions and positions by the host stage width divided by 720. Use the transparent source cutout matching `file`; do not use an opaque screenshot, which would obscure the decorative windows.

The same composition is used for Reduced Motion, initial loading and runtime failure. These fallbacks must not briefly show one dish while Rive is already on the completed meal.

## Source and build

- `scene.rml`: editable Rive scene.
- `burger.png`, `fries.png`, `gelato.png`: the three 512 px photographic sources.
- The corresponding WebP files: embedded runtime assets encoded with `cwebp -q 86 -alpha_q 92`.
- `../../../scripts/build-combo-motion.py`: reproducible scene, encoding and fallback-geometry authoring using Python's standard library plus `cwebp`.
- `build/combo.riv`: CLI runtime output, shipped in both apps as `papu-meal.riv`.
- `meal-stage-*.png`, `meal-*-arriving.png` and `meal-reset-*.png`: actual Rive rendering evidence. The CLI's dark preview background is not in the runtime artboard.

```sh
python3 scripts/build-combo-motion.py
rive packages/motion/combo --verify
rive inspect packages/motion/combo --summary
rive packages/motion/combo --once
cp packages/motion/combo/build/combo.riv packages/motion/combo/build/papu-meal.riv
rive packages/motion/combo --screenshot=packages/motion/combo/meal-stage-2.png --data=stage=2 --advance=60
rive packages/motion/combo --screenshot=packages/motion/combo/meal-fries-arriving.png --advance=60 --data=stage=1 --advance=12
```

## Verification

Validated on 28 October 2026 with the installed Rive CLI: zero errors/warnings, three embedded WebP photographs, one state-machine layer, three pose timelines and 223 artboard objects. The runtime is **163,181 bytes** and contains no script bytecode.

All three complete compositions and both intermediate addition frames were visually inspected. Forward playback (`0 → 1 → 2`), reverse playback (`2 → 1`), replay (`2 → 0 → 1 → 2`) and rapid interruption (`0 → 1 → 2 → 0 → 1`, eight frames between changes) each settle pixel-identically to their reference frames. The cumulative forward sequence keeps the earlier food visible while adding the next item. The actual `2 → 0` reset was also inspected at 6 and 18 frames: a single burger smoothly enlarges and recenters while fries and gelato move out and fade together. Its settled frame matches stage 0.
