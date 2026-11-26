# PapuPay loyalty stamp

The `LoyaltySeal` artboard in `scene.rml` plays the 34-frame `InkPress` animation once through the `Feedback` state machine. A scalloped seal bearing the PapuPay fruit presses into the newly earned slot. Sweeto has its own branded imprint in `../sweeto-pass/`. The guest sees the new slot and balance only after staff confirm the stamp. `runtime/guest-loyalty-seal.webp` is the equivalent settled still for loading and Reduced Motion.

From the repository root with Rive CLI 1.8.0:

```sh
RIVE_ANALYTICS=off rive packages/motion/guest-feedback --verify
RIVE_ANALYTICS=off rive packages/motion/guest-feedback --once
cp packages/motion/guest-feedback/build/guest-feedback.riv packages/motion/guest-feedback/runtime/guest-feedback.riv
```
