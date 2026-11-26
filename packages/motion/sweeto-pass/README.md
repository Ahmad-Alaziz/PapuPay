# Sweeto guest pass

`sweeto-pass.rev` is the editable Rive editor backup for the guest stamp and the PapuPay arrival mark. The underlying Rive artboard is `SweetoPass` (240 × 240). `State Machine 1` uses `Timeline 1` in the `Imprint` layer for the one-shot ink mark. `PapuPay Welcome` uses the `PapuPay Arrival` animation for the nonblocking home entrance.

| Runtime file | Use |
| --- | --- |
| `runtime/sweeto-pass.riv` | Full native and browser welcome export, including the imprint |
| `runtime/sweeto-imprint-web.riv` | Browser stamp-only derivative with identical imprint geometry and keyframes, plus Clip Contents disabled so the taller transparent canvas can show the press safely |
| `runtime/sweeto-pass-settled.png` | Lossless 480 × 480 final frame rendered by the runtime; linked into the iOS asset catalog as `sweeto-pass-settled` |
| `runtime/sweeto-pass.webp` | Lossless WebP derivative resized to 288 × 288 for browser receipts |

Replace the full and derivative exports together after editing the imprint. To recreate the derivative, export a copy of the approved artboard with the stamp timeline and state machine alone, and disable Clip Contents in that copy. Keep the editable master unchanged. Verify both state-machine names and the settled pose in the target runtime before publishing. The stamp starts only when a new stamp has been confirmed. Pre-existing stamps display the still. The entrance is a separate one-shot motion and never blocks the first interaction.
