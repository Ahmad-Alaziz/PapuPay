# Custom Rive motion

The shipping asset is authored for PapuPay, not a downloaded demo animation.

- Editable project: `packages/motion/papupay` (`rive.yaml`, RML and image assets).
- Authoring script: `scripts/build-motion.py`.
- Runtime export: `apps/web/public/assets/papu.riv` and `apps/ios/Resources/papu.riv`.
- Artboard: `Papu`, 500 × 500, transparent.
- State machine: `Papu`.
- Inputs: `Hover` boolean; `Scan` and `Celebrate` triggers.
- Timelines: Breathe; Lean in; Little scan, big yum; Made your day.

Idle breath translates the papaya subtly. Hover leans it toward the pointer. A scan sequence draws corner brackets and a sweep, then springs into a celebration with 14 confetti pieces and a confirmation seal. Tap/click also celebrates. The design uses a rendered dimensional papaya bitmap transformed by Rive; it is not a live 3D mesh.

Both apps respect Reduced Motion and show the static papaya instead. Rive is lazy-loaded on the web. Its WASM runtime is self-hosted, so the demo does not depend on a runtime CDN request. The native app uses Rive iOS 6.27.0.

## Editing and exporting

The official Rive CLI 1.8.0 was used, with its vendor SHA-256 verified. Follow the project’s `AGENTS.md` and Rive schema documentation. The installed desktop editor can be used to inspect exported assets; the editable, reproducible authoring source is the CLI project.

```sh
python3 scripts/build-motion.py
rive packages/motion/papupay --verify
rive inspect packages/motion/papupay --summary
```

The Rive project’s own documentation lists export/preview commands. Validate and render the actual output after changes; a successful parser check alone does not prove animation quality. The shipping export was checked at idle and after pointer interaction. Validation reported zero warnings and errors; the asset contained 1,319 objects and 455 keyframes and was 347,857 bytes.

The animated hall map itself uses SVG/native SwiftUI paths for exact official geometry, keyboard/selectable venue controls, and destination highlighting. Rive is used where its state machine adds a distinctive branded response, not as an inaccessible replacement for the map’s controls.
