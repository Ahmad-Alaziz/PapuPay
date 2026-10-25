> Archived design exploration. The shipping opening now uses real Hala Koszyki photography. The editable source and original food cutouts remain here for provenance; its runtime assets are no longer bundled.

# PapuPay shared table

The hero explains PapuPay's core idea through one composition: dishes from ATOM,
KAGO and Semolino meet at a shared table. The shipping banner plays the shared
composition as a decorative entrance. Cuisine filtering lives in the menu below,
so the banner has no plate selectors, kitchen labels or menu shortcuts.

## Runtime contract

- Artboard: `PapuTable`, 800 × 620, transparent.
- Default state machine: `PapuTable`.
- Default view model: `PapuTableModel`.
- Number property: `selected` — `0` whole table, `1` ATOM burger, `2` KAGO ramen,
  `3` Semolino pizza.
- The editable authoring preview retains focus poses and click listeners for
  art direction. Shipping wrappers keep `selected` at its default 0 and disable
  pointer interaction. These authoring affordances are not product controls.
- Application headings, table number, localized descriptions and menu actions
  remain semantic HTML or SwiftUI controls outside the canvas.

Default plate centers are `(230, 320)`, `(548, 242)`, `(478, 442)` in artboard
coordinates. Nominal cutout widths are 335, 320 and 355. Match these proportions
in static fallbacks. Selected dishes scale to 1.13 and lift 18 px; other dishes
scale to 0.88 and move slightly outward. All remain fully opaque.

## Motion and performance

The three state-machine layers own separate transforms:

1. `Arrive at your table`: a 78-frame, 1.3-second soft entrance. All food is already
   visible in the first frame at 94% scale/opacity to avoid a static-to-empty
   handoff. A small overshoot settles into the final composition.
2. `Explore every kitchen`: four one-frame poses blend over 320 ms as `selected`
   changes. Focus moves the whole food group, including its contact shadow.
3. `Kitchen warmth`: an 84-frame, 1.4-second entrance-only steam accent.

**All six timelines are one-shot. There are no animation loops, scripts, audio,
video, or network resources inside the file.** Wrappers pause after 2 seconds,
pause when hidden/inactive, and redraw after resizing. Reduced Motion uses matching
static plates. Explore kitchens and How it works remain normal accessible controls.

## Source and export

- `scene.rml` is the editable authored scene.
- `author.py` regenerates that scene; update the generator when maintaining a
  generated property, or edit `scene.rml` directly without rerunning it.
- `burger.png`, `ramen.png`, `pizza.png` are 640 × 640 alpha cutouts generated for
  PapuPay. They depict illustrative demo dishes and are embedded once in the `.riv`.
- Web fallback images: `apps/web/public/assets/table-{burger,ramen,pizza}.webp`.
- Native fallback images: `apps/ios/Resources/Assets.xcassets/table-*.imageset`.
- Runtime copies: `apps/web/public/assets/table.riv` and
  `apps/ios/Resources/papu-table.riv`.

Run from the repository root (the current machine's CLI is `/tmp/rive-cli/rive`):

```sh
python3 packages/motion/table/author.py
rive packages/motion/table --verify --format=json
rive inspect packages/motion/table --summary
rive packages/motion/table --screenshot=/tmp/papu-table-all.png --advance=2s
rive packages/motion/table --screenshot=/tmp/papu-table-kago.png --data=selected=2 --advance=2s
rive packages/motion/table --data-dump=/tmp/papu-table-tap.json --advance=2s --pointer=click@548,242 --advance=35
cp packages/motion/table/build/table.riv apps/web/public/assets/table.riv
cp packages/motion/table/build/table.riv apps/ios/Resources/papu-table.riv
rive packages/motion/table
```

Leave the preview running for review. Follow `AGENTS.md`; use CLI schemas rather
than guessing RML properties. Do not use `rive push` as a preview step.

## Verification

CLI 1.8.0 reports zero errors/warnings, one artboard, three layers, six animations,
three plate listeners and 161 keyframes. The export is 1,913,011 bytes. Actual
rendered frames were inspected at frame 1, after the entrance, and with kitchen
focus. Headless pointer interaction independently changed the resulting view-model
value to 1, 2 and 3 for the burger, ramen and pizza. This was checked against
actual data dumps rather than inferred from a successful compilation.

## Design references inspected

- [tubik, Planetono case study](https://dribbble.com/shots/27125632-Case-Study-Fast-Food-Chain-Landing-Page)
  describes food assembling in one continuous space. The studio's
  [animated presentation](https://dribbble.com/shots/27100942-Planetono-Preloader-Animation-for-a-Fast-Food-Chain-Website)
  was visually inspected: an oversized dimensional food composition carries the
  idea while concise controls support it. PapuPay applies that narrative to a
  communal table rather than introducing a separate fictional world.
- [Fishermen Labs, Common Foods](https://dribbble.com/shots/6955589-Add-to-Cart-Animation-Common-Foods)
  was visually inspected for the relationship between a large product image,
  a compact action and a visible outcome. PapuPay's hero interaction focuses a
  kitchen; basket changes remain explicit application actions.
- Official Rive [data binding](https://rive.app/docs/editor/data-binding/overview)
  and [listeners](https://rive.app/docs/editor/state-machine/listeners) document
  the semantic app-to-scene contract and tap-to-property interaction used here.
- Apple's [Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
  guidance supports brief purposeful feedback and an optional motion experience.
