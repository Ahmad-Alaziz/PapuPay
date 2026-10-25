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


## Interactive discovery and cart clarity — build 1.0 (5.1)

- Application commit `641500d5cd2ce187ded07dd8458781398282142a`; [signed workflow 40189148142](https://github.com/Ahmad-Alaziz/PapuPay/actions/runs/40189148142) completed and uploaded without errors. All four signed bundles validated; 20 compiled native invocation checks passed. Signed raw Clip **9,128,059 bytes / 9.128 MB**, remaining raw 15 MB budget **5,871,941 bytes**. Reports: `v4-signed-archive-summary.json`, `v4-signed-clip-size.json`.
- Apple processed **1.0 (5.1)**; the existing PapuPay Demo internal group reports **Testing**. Polish instructions and table-24/table-37 App Clip invocations are saved. No public or external release was submitted.
- Vercel confirms the final application deployment succeeded: [deployment F3FsCtAvw3Vyp95Sw51USutjtMqG](https://vercel.com/ahmadalazizs-projects/papupay/F3FsCtAvw3Vyp95Sw51USutjtMqG). New visual/interaction journeys were verified against the local production build; the public-domain browser check restriction recorded above was not bypassed.
- Web: 30 tests and final TypeScript/Vite build passed. At 320/390-pixel phone and 1280-pixel desktop layouts, inspected header, opening food photo, hero choices, restaurant dialog, customized add, basket, checkout and route. No horizontal overflow at the inspected narrow widths. Heading DOM scan found no trailing full stops and no Favorites controls.
- Direct hero ramen add and restaurant customized quantity-two burger add produced a basket of three items, two kitchens and **128 zł**. Item-specific confirmation appeared above the active restaurant dialog; persistent View basket remained after feedback expired. The first basket entrance briefly crossed the bottom navigation and was corrected to a short fade/scale with 12-pixel settled clearance.
- An old open tab could repeatedly echo the removed favorites field into storage; incoming snapshots now synchronize without being written back. A missing lazy animation chunk during a local rebuild exposed a blank-checkout failure; lazy loading now falls back to the dimensional papaya so checkout remains usable. The subsequent production build passed and the final fresh page's guided tour loaded.
- Native simulator: interactive photo hero, unboxed brand, direct quick-add check/count + item-specific panel, persistent basket, nested restaurant/dish add → View basket → checkout → ready → actual pickup tickets passed. Map route inspected with large floating number/table labels removed. No new image assets were added. Independent source review caught a false VoiceOver success at the item cap; the final build announces the limit correctly.
- Screenshots: `docs/screenshots/v4-native-{hero,added,map}.png` and `v4-web-desktop.png`. Reduced Motion disables hero tilt and uses subdued transitions; physical-iPhone frame profiling remains unobserved.


## Shared-table opening — build 1.0 (6.1)

- Final application commit `4be52b1f1cdf6669722677a3769b0a21ce551cc2`. [Signed workflow 40193992061](https://github.com/Ahmad-Alaziz/PapuPay/actions/runs/40193992061) passed and uploaded with no errors. All four signed bundles are version 1.0, build 6.1; 20 compiled invocation checks passed. Reports: `v5-signed-archive-summary.json`, `v5-signed-clip-size.json`.
- Signed raw Clip **12,473,460 bytes / 12.473 MB**, with **2,526,540 bytes** remaining under the conservative 15 MB raw gate. Apple's thinned measurement remains authoritative.
- Apple processed 6.1 and the existing PapuPay Demo internal group reports Testing. Saved Polish notes describe the final simplified banner and existing catalog controls. Table-24/table-37 App Clip invocations remain present. No external beta or public release was submitted.
- Vercel confirms the final app commit deployed successfully: [deployment 7jc8i25Bu3jHtVUHbu7eJv2LKqzN](https://vercel.com/ahmadalazizs-projects/papupay/7jc8i25Bu3jHtVUHbu7eJv2LKqzN). Visual journeys were verified on the local production build; the previously recorded hosted browser restriction was not bypassed.
- Final hero has no cuisine selectors, food hotspots, kitchen labels, selected-kitchen captions or menu shortcuts. It contains only Explore kitchens and How it works. The existing catalog filters remain the only cuisine selection. Actual browser inspection at 320, 390 and 1280 px confirmed no narrow overflow, a live Rive canvas, and both actions. Explore kitchens scrolled to the catalog; Burgers then filtered the list to ATOM; How it works opened the guided tour.
- Rive scene verifies with zero errors/warnings, uses three original alpha food cutouts, six one-shot timelines and no perpetual loops. The application keeps the shared-table pose at zero with pointer input disabled. Both wrappers pause after two seconds and use a static reduced-motion/error fallback. A resize-after-pause canvas crop was caught and fixed; actual 320-to-1280 resize rendered correctly afterward.
- Web: 30 tests passed during this pass, final TypeScript/Vite build passed after simplification. Native: all four final targets compiled, App Clip table 37 rendered the new opening, and All kitchens visibly scrolled to the search and sole cuisine-filter row. Physical-iPhone frame profiling and device installation of 6.1 remain unobserved.
- Final screenshots: `docs/screenshots/v5-shared-table-web.png`, `v5-shared-table-native.png`. The custom scene source and maintenance notes are in `packages/motion/table`.


## Simple venue opening and aligned Live Activity — 25 October 2026

Final direction: authentic Hala Koszyki photography, CAŁA HALA / JEDEN KOSZYK (EN ONE FOOD HALL / ONE BASKET), text-orange #B7471B on the second line in both apps. A single 500–650 ms entrance settles into a still photo. No large hero Rive asset, banner selectors or animation controls ship. Existing guided Rive scenes remain.

- Final web TypeScript/Vite production build passed. The existing 30 ordering/routing checks passed during this pass; no ordering-domain logic changed afterward.
- Actual local production browser checked at 320, 390 and 1280 px; PL and EN checked; no narrow horizontal overflow. The primary browse action reached the real catalog.
- Dish customization → add → in-dialog item/count/total confirmation → persistent basket action → checkout → clearly labeled demo order → ready status → collection verified. The 48 px food flight was visibly captured in the active menu dialog; actual order/collection state remained correct.
- Native all-four-target simulator build passed (`/tmp/papu-venue-final-build.log`). Final App Clip table37 PL/EN layouts visually inspected; orange line, photo crop, margins and Explore kitchens destination verified.
- New Lock Screen ready activity inspected with ATOM + Bar Koszyki, table24, 2/2 kitchens and pickup units8/28. The evidence includes an unrelated older table37 demo activity above it; the new card is the lower card. Consistent text direction, locale, content grid and centered counter verified in the new card.
- Dynamic Island compact/minimal/expanded source was audited and compiled with bounded content and PL/EN locale; separate runtime screenshots of those presentations were not obtained.
- Physical iPhone performance and installation of the new build are not inferred from simulator checks.

Evidence: `docs/screenshots/v6-venue-web-mobile.png`, `v6-venue-web-desktop.png`, `v6-venue-native.png`, `v6-live-activity-ready.png`. Release/signing outcomes are recorded after the actual upload and Apple processing.

Signed delivery: final source commit `edc07abc80de62f1bbe0c7d3e0ccb4040c596e4e` deployed successfully on Vercel. [TestFlight workflow 40213630310](https://github.com/Ahmad-Alaziz/PapuPay/actions/runs/40213630310) signed, archived, validated and uploaded version 1.0 (7.1) with no upload errors. All four embedded bundle versions passed, as did 20 compiled native invocation checks. The signed raw Clip is 9,131,563 bytes (9.132 MB), leaving 5,868,437 bytes against the 15,000,000-byte gate. Reports are preserved as `v6-signed-clip-size.json` and `v6-signed-archive-summary.json`. Final web tests were rerun after the simple-photo source freeze: 30/30 passed.


## Three-kitchen combo — 25 October 2026

- Custom Rive scene `PapuCombo`, bound `stage` 0/1/2, uses three newly generated food cutouts with 700 ms reversible transitions. CLI verification found no errors/warnings. Settled 0→1→2→0 and interrupted-transition poses were checked against authored stills.
- Real Koszyki vendors and categories verified against primary sources: ATOM Burgers unit 8, The Fry unit 7, Na końcu tęczy unit 20. Added the tenth kitchen and a demo ice-cream item to shared/native catalogs; map routes include the new destination.
- Web: 30 domain/routing checks passed, including all ten kitchens ready within 12–28 seconds. Production TypeScript/Vite build passed. Actual 320/390-pixel layouts, PL/EN, three-stage controls and canvas resizing were inspected. A paused-canvas resize crop was found and fixed.
- Actual combo review: all-zero selection disables confirmation; restoring three quantity-one items and confirming opens the real grouped basket at 72 PLN. Test items removed after the check. Notes, options and per-line limits were independently reviewed. A swipe followed by an unintended click was caught and fixed.
- Native: all four targets compiled; actual simulator autoplay reached stage 2, manual/reverse controls rendered all poses, and the matching initial still avoids a remount flash. Empty review disables Add; confirming the three items opens the grouped 72 PLN basket.
- Signed size, deployment and TestFlight assignment are recorded below after actual delivery. Physical-iPhone performance remains unobserved.

Signed delivery: application commit `dfff323971ce4e1024fd97f73b35be5780316c2b` deployed successfully on [Vercel](https://vercel.com/ahmadalazizs-projects/papupay/GkJLAanyhtuu9g7o4KRkEiuJaEgT). [Workflow 40219410134](https://github.com/Ahmad-Alaziz/PapuPay/actions/runs/40219410134) signed and uploaded **1.0 (8.1)** with no upload errors. All four bundles and 20 compiled invocation checks passed. Signed raw Clip **11,037,954 bytes / 11.038 MB**, remaining 15 MB budget **3,962,046 bytes**. Reports: `v7-signed-archive-summary.json`, `v7-signed-clip-size.json`. The public-domain browser refresh was rejected by automatic approval review after redirecting to the unrelated Cloudflare block origin; no bypass was attempted. Local production interaction evidence and successful Vercel deployment are recorded separately.

Apple processed 8.1 and the existing PapuPay Demo internal group reports **Testing**. Polish test notes and table-24/table-37 invocations are saved. The user then requested a closer match to the Kumo reference; the next revision replaces this three-food composition with a full vendor carousel.
