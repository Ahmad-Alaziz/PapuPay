# PapuPay motion library

Each project keeps its editable design alongside a `runtime/` directory containing the approved files used by customers and staff. Public web URLs point to those files using repository-relative symbolic links. Native targets reference the same `.riv` files by their existing bundle names. The browser and App Clip therefore share the exported animation without maintaining copies of the same binary.

| Project | Runtime URL | Rive contract |
| --- | --- | --- |
| Sweeto guest pass | `/assets/sweeto/sweeto-pass.riv` | `SweetoPass`, `State Machine 1` (ink imprint), `PapuPay Welcome` (arrival) |
| Sweeto browser imprint | `/assets/sweeto/sweeto-imprint-web.riv` | `SweetoPass`, `State Machine 1` (browser press outside the artboard bounds) |
| Sweeto stamp still | `/assets/sweeto/sweeto-pass.webp` | Compact derivative of the lossless settled PNG |
| Venue action illustrations | `/assets/sweeto/sweeto-actions.riv` | `SweetoMenu`, `SweetoLoyalty`, `SweetoReview`, `SweetoWifi`; `Gesture`; `VenuePalette` |
| Shared guest stamp | `/assets/guest-feedback.riv` | `LoyaltySeal`, `Feedback`; static fallback `/assets/guest-loyalty-seal.webp` |
| Wallet pocket | `/assets/wallet-pocket.riv` | `Pocket`, `Preview` or `Handoff`; static fallback `/assets/wallet-pocket-still.svg` |

Venue action stills are adjacent to their Rive export under `sweeto-actions/runtime/`. Existing `motion-*.webp` URLs cover the Sweeto, berry and forest palettes. The full Sweeto guest pass belongs to Sweeto's venue flow. Other venues continue to use the shared guest stamp.

## Publishing

Edit a project's `scene.rml` or editable `.rev` file, verify the actual rendered states in Rive, then export the reviewed runtime into that project's `runtime/` directory. CLI `build/` directories remain temporary. Public URL aliases and native resource references update when the canonical file is replaced. Do not put another copy of the runtime in a client directory.

For Reduced Motion, runtime loading and failure, use a settled frame rendered from the same animation. The native image catalog links to the lossless Sweeto PNG and the web loads its optimized WebP derivative.

`runtime/rive.wasm` is the MIT-licensed `@rive-app/canvas` 2.45.1 runtime shipped locally at `/assets/rive.wasm`. When updating the Rive web dependency, verify or replace this vendored WASM with the corresponding resolved package file.

The legacy Hala food and order-journey projects, where present in older demo checkouts, follow the same layout. They are separate from the Sweeto guest and staff runtime assets.
