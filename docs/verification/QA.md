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

Screenshots are in `docs/screenshots`. Verified hosting deployment details follow.

## Hosting status

GitHub repository `Ahmad-Alaziz/PapuPay` is connected to the Vercel `papupay` project. Production is live at https://papupay.vercel.app/ on the existing Hobby workspace, with root-level build configuration and `main` as the production branch.

Hosted checks on 25 October 2026:

- Public HTML loads without authentication.
- Classic Smash + Tantanmen ramen produce the correct 82 zł checkout total and two persisted kitchen tickets.
- `/clip?venue=koszyki&table=37` renders the React fallback with table 37.
- Self-hosted font, image and Rive assets render. No browser console errors were observed; the Rive runtime emits a non-blocking deprecation warning for state-machine inputs, which should be migrated before a future major runtime upgrade.
- A public table-24 QR is included as PNG and SVG in `docs/testing`.

The previously reserved Sites project has no deployment and is not the selected hosting destination.

## Custom domain and QR routing — 25 October 2026

- Coming-soon homepage and separate web entry added; the QR path is `/go/koszyki/{table}`.
- 29 web tests pass, including unknown halls, malformed/ambiguous links, legacy links, hall identity on order snapshots, and legacy-order migration.
- 19 compiled Swift invocation checks pass, including host validation and the same hall/table failure cases.
- Updated native host, Clip and widgets build in the simulator; unsigned device Release Clip passes the size gate at 11.632 MB.
- Namecheap A/CNAME records point to Vercel; public apex HTTPS responds successfully. Email settings preserved.
- Apple app record 6826778125 and four bundle identifiers registered under the personal team. Native signing/upload blocked by this Mac's managed Apple Account restriction. App Clip experience metadata requires an uploaded build; public invocation remains pending Apple release.

Final public-domain checks:

- Vercel reports Valid Configuration for both `papupay.com` and `www.papupay.com`.
- Apex homepage renders the coming-soon design; `/app` presents the scan guidance and explicit table-24 demo link.
- `/go/koszyki/37` renders the ordering document and preserves table 37 through a 36 zł simulated checkout, confirmation and kitchen ticket; the ticket survives reload.
- `/go/another-hall/24` shows the invalid-link screen. The actual native Clip also blocks this invocation and only opens table 24 after its explicit demo recovery button is tapped.
- `www.papupay.com/go/koszyki/37?test=1` returns HTTP 308 to the identical apex path and query.
- The AASA endpoint returns HTTP 200 with `application/json`, the registered personal team IDs, and no redirect.
- The QR HTML contains the real Smart App Banner metadata; the marketing HTML does not.
- Live homepage screenshot captured after deployment. Physical-device signing and public App Clip activation remain pending as described above.
