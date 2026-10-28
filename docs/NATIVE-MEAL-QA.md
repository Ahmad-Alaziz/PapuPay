# Native cumulative meal QA — 2026-10-28

All four simulator targets built successfully: PapuPay, PapuPayClip, PapuPayLiveActivity, PapuPayClipLiveActivity. Build log: `/tmp/papu-meal-native-build.log` (local artifact).

Validated in the running iPhone 17 Pro / iOS 26.5 App Clip with the Koszyki table 24 invocation:

- The photographic burger stays visible while fries and then gelato join it. All ten decorative vendor window assets remain available. The curve advances to The Fry, then Na końcu tęczy; the meal builds, holds, and resets to the centred burger as the windows return. The coherent build → hold → reset story repeats automatically with a subtle spring. A pause/play control is available; its label and stable paused state were verified in the simulator. Pausing also cancels a pending food addition and pauses the Rive renderer; resume re-arms the pending addition. The final video captures two complete meal builds and resets, including the additions leaving and the burger returning to its original position.
- The one hero CTA scrolls to the shared kitchen catalog. No hero selection changes the basket or opens a duplicate ordering flow.
- Persistent add confirmation displays the exact quantity and a visible basket action.
- With 19 identical burgers in the basket, the dish UI offers exactly one more, disables plus, and charges for one. Adding confirms one and reaches 20. Reopening the full line shows the limit instead of an add action.
- “Add from another kitchen” returns both a root basket and a restaurant → dish → basket stack directly to the shared catalog, dismissing the entire modal stack.
- The 44pt trash action removes the complete 20-item line. The empty basket contains no stale add confirmation.
- Gelato customization has no unrelated extra-sauce option. The kitchen-note placeholder is neutral for all dishes.
- Demo checkout, the ready order ticket, and pickup completion work. Notification permission was enabled in the simulator; checkout reported its ready alert scheduled. An actual banner-delivery capture was not retained.
- The real lock-screen Live Activity reached ready state with the vendor name, table, counter and progress aligned. Captured in `screenshots/v9-meal-native-widget.png`.

Implementation safeguards inspected: Reduce Motion/VoiceOver use the complete static meal; the food renderer pauses offscreen/backgrounded and after settling; the decorative window tour pauses offscreen and has a separate user pause/play control; a matching bundled composition covers renderer startup or failure. Those OS accessibility modes were reviewed in code rather than toggled during this final simulator pass.

Resources: the new meal Rive is 163,181 bytes. The ten vendor window photographs remain bundled; only the former 652,300-byte carousel Rive was replaced. The simulator Assets.car is approximately 4.8 MB; this is not an App Store device-thinned App Clip size measurement.

Visual evidence: `screenshots/v9-meal-native.png`, `screenshots/v9-meal-native.mp4`, `screenshots/v9-meal-native-catalog.png`, `screenshots/v9-meal-native-widget.png`.
