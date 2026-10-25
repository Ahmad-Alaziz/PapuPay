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

At the original local verification, no physical iPhone installation was completed because this Mac had no signing identity. The later cloud/TestFlight delivery below removes that installation blocker; App Store Connect reports an internal tester installation. Physical-device interaction/performance testing has not been observed by the agent. No real payment or POS order was sent. This is a local-data MVP, with foreground-driven Live Activity updates. The diagrammatic table location is illustrative. Full VoiceOver, all Dynamic Type settings, physical-device performance, dark appearance, and signed thinned archive checks remain release qualification work.

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
- Apple app record 6826778125 and four bundle identifiers registered under the personal team. Local Xcode signing is blocked by this Mac's managed Apple Account restriction; later cloud signing and TestFlight delivery succeeded as recorded below. Public invocation remains pending Apple release.

Final public-domain checks:

- Vercel reports Valid Configuration for both `papupay.com` and `www.papupay.com`.
- Apex homepage renders the coming-soon design; `/app` presents the scan guidance and explicit table-24 demo link.
- `/go/koszyki/37` renders the ordering document and preserves table 37 through a 36 zł simulated checkout, confirmation and kitchen ticket; the ticket survives reload.
- `/go/another-hall/24` shows the invalid-link screen. The actual native Clip also blocks this invocation and only opens table 24 after its explicit demo recovery button is tapped.
- `www.papupay.com/go/koszyki/37?test=1` returns HTTP 308 to the identical apex path and query.
- The AASA endpoint returns HTTP 200 with `application/json`, the registered personal team IDs, and no redirect.
- The QR HTML contains the real Smart App Banner metadata; the marketing HTML does not.
- Live homepage screenshot captured after deployment. Cloud signing subsequently succeeded as recorded below. Public App Clip activation remains pending Apple release.


## Cloud signing and TestFlight — 25 October 2026

- [Signed workflow run 40178646114](https://github.com/Ahmad-Alaziz/PapuPay/actions/runs/40178646114) passed on GitHub-hosted macOS 26 / Xcode 26.6, commit `e0937d7`. Version **1.0 (2.1)** exported and uploaded successfully; Apple completed processing.
- 20 compiled Swift invocation checks passed. All four signed bundles passed archive validation, including the host, Clip and both Live Activity extensions.
- Signed raw App Clip: **8,989,622 bytes / 8.99 MB**, including Rive, the embedded widget and signing material. Remaining raw 15 MB budget: **6,010,378 bytes**. Preserved reports: `cloud-archive-summary.json`, `cloud-clip-size.json`. Apple’s thinned measurement remains authoritative.
- The unsigned [archive workflow 40178582897](https://github.com/Ahmad-Alaziz/PapuPay/actions/runs/40178582897) also passed.
- Dedicated API and distribution keys are in encrypted `apple-signing` environment secrets, restricted to `main`; temporary cloud keychain/profile material is removed on exit. No local Xcode account or signing identity was installed.
- **PapuPay Demo** has one internal tester and build **1.0 (2.1)**, with verified **Testing** status. App Store Connect reports the tester installed the build; this does not substitute for observed physical-device UX testing.
- Saved App Clip invocations: **Koszyki · 24** (`https://papupay.com/go/koszyki/24`) and **Koszyki · 37** (`https://papupay.com/go/koszyki/37`). Polish test instructions identify simulated payments/orders and foreground-driven Live Activities.
- No external beta review or public App Store release was submitted. Public QR links continue to serve the web fallback until the App Clip experience is released.


## Full typography, motion and readiness pass — 25 October 2026

This section supersedes the earlier typography/motion/timing details above.

- 30 web tests passed, including stage-boundary timing and a nine-kitchen basket completing within 28 seconds; 20 compiled native invocation checks passed.
- Web production build passed. Actual browser journeys covered customized multi-kitchen checkout, 12/14-second readiness, ticket collection/reorder, search recovery, Polish/English, focused/full hall map and destination selection. Responsive layouts were inspected at 320, 390, 430 and 1440 pixels; narrow hero clipping was corrected.
- Native host, App Clip and both widget extensions compiled and archived. Release raw Clip was approximately 8.91 MB, comfortably below the conservative 15 MB gate; signed cloud report follows release.
- Native ready alerts were delivered by iOS while PapuPay was off-screen. A notification-tap restoration crash was found, repaired and retested: the alert opened table 24's order tickets with no subsequent crash report.
- Actual new Live Activity rendered on the Lock Screen and reached ready. A missing widget entry point was caught during runtime QA and restored. Older simulator activities from previous bundle IDs were distinguished from the new design.
- Native home, pickup tickets, map and Rive onboarding were visually inspected. The map now exposes one coherent accessibility description instead of repeating it for every shape. Native horizontal dish cards reserve two title lines for consistent alignment.
- Custom Rive scenes validated with zero warnings/errors and rendered in both runtimes. Runtime inputs now use data binding. Whole-scene transitions replace title-only swaps. Global one-second UI invalidations were removed; countdowns update locally and Rive pauses when hidden.
- Native notification permission and finite background execution remain OS-controlled. Long-running server push, real payments/POS, closed-tab web push and physical-device frame profiling remain outside this local-data MVP.


## Final refinement delivery — build 1.0 (4.1)

- Final application commit: `e3b08e48f97b82be3f4ef90eb2166958db736b4c`. [Signed workflow 40186489169](https://github.com/Ahmad-Alaziz/PapuPay/actions/runs/40186489169) passed and uploaded with no errors. All four signed bundles passed packaging checks.
- Signed raw App Clip: **9,042,651 bytes / 9.043 MB**; **5,957,349 bytes** remain under the 15 MB gate. See `refinement-signed-clip-size.json`. Apple's thinned measurement remains authoritative.
- Apple processed **1.0 (4.1)** and the existing **PapuPay Demo** internal group reports **Testing**. Polish release instructions and App Clip table-24/table-37 invocations are saved. No external review or public release was submitted.
- Vercel reports the final application commit deployed successfully: [deployment FCNKCeDyBWMFS3f8zL4EeYp4u3G9](https://vercel.com/ahmadalazizs-projects/papupay/FCNKCeDyBWMFS3f8zL4EeYp4u3G9). The core redesigned production journey, typography and Rive scenes were checked on the first refinement deployment. The final count-copy and confirmation-ready changes passed local web and native checks. A subsequent production browser refresh was blocked after redirecting to a Cloudflare block origin; no bypass was attempted.
- The confirmation stays open and automatically transitions from cooking to the ready receipt, new title, pickup instructions and action. Verified in both the browser and final native simulator build. Polish single-item and single-kitchen labels were corrected.
- Final native screenshot: `docs/screenshots/v3-native-ready.png`. The earlier home, map and order screenshots show the same visual system.
- Physical-iPhone frame profiling is still unobserved. This release uses real native local notifications and finite background demo ActivityKit updates; reliable production push and closed-tab browser notifications still require a backend.
