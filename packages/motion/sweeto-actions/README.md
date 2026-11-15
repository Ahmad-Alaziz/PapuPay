# Sweeto action illustrations

The four transparent vector artboards in `scene.rml` share a venue palette. Each uses filled paper shapes, a contact shadow and an ink accent.

| Artboard        | Motion                                                                                      | One-shot duration   |
| --------------- | ------------------------------------------------------------------------------------------- | ------------------- |
| `SweetoMenu`    | A ruled restaurant menu dips at its spine. One cream leaf fans across to a tabbed spread.   | 43 frames at 60 fps |
| `SweetoLoyalty` | The ticket flexes at its perforation. The rubber foot compresses, followed by the ink ring. | 50 frames at 60 fps |
| `SweetoReview`  | Text rules sweep across the cream conversation bubble. A check draws on its reply.          | 47 frames at 60 fps |
| `SweetoWifi`    | A tabletop card lifts and its printed Wi-Fi curves expand.                                  | 43 frames at 60 fps |

Each artboard runs its `Gesture` state machine once when the web player starts. The guest page introduces visible artboards one at a time and offers replay on touch press, keyboard focus and hover. Static WebP artwork matches the settled poses. Reduced motion uses the stills. The Wi-Fi scene illustrates where to find the guest network instructions.

## Venue colors

The `VenuePalette` Rive view model exports three named instances, `sweeto`, `berry` and `forest`. Fill and stroke colors are bound to shared role properties. The React player selects the instance before playback. `SweetoMotionThemeContext` sets a venue default and the optional `theme` prop overrides an individual illustration.

## Rebuild

This repository’s authored Rive assets support offline vector export with Rive CLI 1.8.0.

```sh
RIVE_ANALYTICS=off rive packages/motion/sweeto-actions --verify
RIVE_ANALYTICS=off rive inspect packages/motion/sweeto-actions --summary
RIVE_ANALYTICS=off rive packages/motion/sweeto-actions --once
cp packages/motion/sweeto-actions/build/sweeto-actions.riv apps/web/public/assets/sweeto/sweeto-actions.riv
```

For fallback artwork, capture the artboards at their last frames at 256×256 pixels, preserve transparency and export lossless WebP as `motion-menu.webp`, `motion-loyalty.webp`, `motion-review.webp` and `motion-wifi.webp` for Sweeto. Prefix the illustration name with `berry-` or `forest-` for the other two palettes, such as `motion-forest-menu.webp`.
