# Verification record

Checked on 25 October 2026 using the local production web build and Xcode 27.1 / iOS 26.5 iPhone 17 Pro simulator.

## Automated and build checks

- React production build: passed TypeScript and Vite build.
- Vitest: 12 tests pass, covering multi-venue totals, customization identity, note normalization, quantity limits, QR table validation, order progression, and malformed persisted order rejection.
- Xcode Debug: host app, App Clip and both widget extensions build successfully.
- Device Release App Clip: unsigned build succeeds; size report in `clip-size.json`.
- Custom Rive export: verification and actual rendered idle / interactive frames checked.

## Browser journeys

- Polish and English discovery, restaurant selection, menu and customization were exercised in the browser.
- Multi-venue basket with customized quantity-two burger and ramen: correct 128 zł total, simulated checkout, separate persisted tickets.
- Pickup selection navigates to the correct restaurant on the map. Collection and reorder preserve the customized burger’s quantity, extra sauce and note.
- 325- and 390-pixel mobile and desktop typography visually inspected; mobile page has no horizontal overflow.
- Discovered and corrected tiny metadata, hit targets and a partially hidden sticky item footer during the final typography pass.
- Production assets self-hosted, including fonts and Rive WASM.

## Native journeys

- Real app installed and launched in the simulator; bundled food images, custom Bricolage font, capitalized brand and native glass navigation rendered.
- Burger + ramen basket: two kitchens, total PLN 82, simulated checkout, separate tickets.
- Actual ActivityKit Live Activity appeared on the simulator Lock Screen, progressed to ready, and showed both kitchen counts.
- Collected ticket changed state and reorder restored Classic Smash at PLN 36 to the basket.
- Actual App Clip target invoked with table 37, completed checkout, and created its own Live Activity.
- Native animation and guided onboarding rendered using the shipping `.riv` asset.
- Corrected system-locale leakage into native quantity text and the English Live Activity layout.

## Boundaries

No physical iPhone installation was completed: the Mac has no valid signing identity. No real payment or POS order was sent. This is a local-data MVP, with foreground-driven Live Activity updates. The diagrammatic table location is illustrative. Full VoiceOver, all Dynamic Type settings, physical-device performance, dark appearance, and signed thinned archive checks remain release qualification work.

Screenshots are in `docs/screenshots`. Hosting deployment details are appended after the deployment result is verified.

## Hosting status

Private Site registered, source not uploaded, deployment not started. Automatic approval review rejected export of the full source and assets to Sites without explicit destination approval. Local repository and preview are complete; a hosting approval question is pending.
