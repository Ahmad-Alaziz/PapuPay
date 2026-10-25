# Testing on your iPhone

## Fastest: the web demo

Open **https://papupay.com/go/koszyki/24** on your phone, or scan `docs/testing/koszyki-table-24.png`. No installation or shared Wi-Fi is needed. This is the hosted React demo; native App Clip testing is described below.

For local development, run the production preview on the Mac:

```sh
npm run build
npm run preview -w apps/web -- --host 0.0.0.0 --port 4173
```

Connect the phone and Mac to the same Wi-Fi. Open the network address Vite prints, adding `?table=24`. At handoff the address was `http://192.168.1.73:4173/?table=24`; it may change with Wi-Fi. The generated QR in `docs/testing/web-table-24.png` points to that address. This tests the React app, not native App Clip invocation. Camera scanning is performed by the phone’s Camera app; PapuPay itself requests no camera permission.

Android and other browsers use the same hosted responsive web app. Deployment details are recorded in `docs/DEPLOYMENT.md`.

## Cloud signing without local Xcode sign-in

The latest verified signed version is recorded in [Cloud builds](CLOUD-BUILDS.md). Builds are signed and uploaded from GitHub Actions. Local Xcode sign-in is not required. See [Cloud builds and TestFlight](CLOUD-BUILDS.md) for the verified workflow and encrypted secret configuration.

1. Install Apple’s **TestFlight** app on your iPhone.
2. Open the TestFlight invitation sent to the personal Apple account used for App Store Connect, and accept it.
3. Open **PapuPay** in TestFlight. Install the full app, or select the App Clip experience. Only one of the full app and its Clip can be installed at a time; TestFlight lets you switch.
4. For the Clip, launch **Koszyki · 24** or **Koszyki · 37** and confirm the corresponding table before ordering.
5. Place a demo order, allow Live Activities if asked, and inspect the Lock Screen / Dynamic Island.

This is an internal beta; no public TestFlight invitation link is enabled. TestFlight installs do not require pairing your iPhone with this Mac or signing into Xcode.

## Native app and App Clip from Xcode

1. Open `apps/ios/PapuPay.xcodeproj`. Let Swift Package Manager resolve Rive 6.27.0.
2. Connect your iPhone, trust the Mac if needed, and enable Developer Mode on the phone.
3. Under Signing & Capabilities select your Apple development team for **all four targets**: PapuPay, PapuPayClip, PapuPayLiveActivity, PapuPayClipLiveActivity.
4. Use bundle identifiers available to your team. If changing the base `com.papupay.app`, also update the host’s associated App Clip identifier and Clip’s parent-application entitlement. Preserve the hierarchy: host, host.Clip, host.LiveActivity, host.Clip.LiveActivity.
5. Select the physical device and run **PapuPayClip**. Its scheme supplies `_XCAppClipURL=https://papupay.com/go/koszyki/24`.
6. Change the scheme environment URL’s final path segment to 37 and run again to confirm invocation context. The simulator verification used the actual Clip bundle and table 37.
7. Place a demo order, allow Live Activities if iOS asks, then lock the phone. Inspect the activity; on supported phones also inspect Dynamic Island. Return to PapuPay or use the demo-ready button to advance status.

**Local Xcode limitation:** this managed Mac rejects personal Apple Account sign-in. The project uses personal team `5W4JVD497D`, and cloud signing/upload now succeeds without installing signing credentials on this Mac. Use TestFlight above; do not bypass the managed-device policy. App Store Connect reports an internal tester installation of 1.0 (2.1); hands-on visual, interaction and performance testing on the phone still belongs to the tester.

## Test the actual scan-to-App-Clip card

An arbitrary QR pointing to an unassociated URL will open Safari. A URL parameter alone does not register an App Clip experience.

For local development, install/run the signed Clip once, then use iPhone **Settings → Developer → Local Experiences** to register a local App Clip experience matching the test invocation URL and Clip bundle identifier. Configure the title, subtitle, action and image. Scan the matching QR with Camera. Apple’s local experience workflow allows testing before an App Store release and before configuring an associated website.

`docs/testing/koszyki-table-24.png` contains `https://papupay.com/go/koszyki/24`. Register that exact URL as the local experience. Older `clip-table-24` artifacts use the original `.example` placeholder and are retained only as historical development assets.

The real `papupay.com` domain, associated-domain entitlements and AASA file now use the registered team and production bundle IDs. App Store Connect record `6826778125` exists. The containing app and Clip are uploaded, with pre-release invocation testing configured in TestFlight. Configure the default and advanced App Clip experiences for the separate public release. Public activation requires Apple review and release; DNS alone does not activate the Clip. See `DOMAIN-AND-QR.md`.

## Size budget

Physical QR/NFC invocations use the **15 MB** App Clip budget on iOS 16+. This project targets iOS 17+. The larger **100 MB** iOS 17+ allowance is restricted to eligible digital invocations; it is not the budget for a printed table QR. Apple measures the uncompressed thinned App Clip variant, not the ZIP/IPA transfer size.

The unsigned device Release bundle is checked conservatively with its Rive framework and embedded widget included:

```sh
xcodebuild -project apps/ios/PapuPay.xcodeproj -scheme PapuPayClip \
  -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' \
  -derivedDataPath /tmp/papupay-release CODE_SIGNING_ALLOWED=NO build
python3 scripts/check-clip-size.py \
  /tmp/papupay-release/Build/Products/Release-iphoneos/PapuPayClip.app --json
```

The successful cloud-signed archive measures **9.13 MB** including Rive, its Live Activity extension and signing material (`docs/verification/v6-signed-clip-size.json`). The earlier local unsigned device build is retained in `clip-size.json` as historical evidence. Keep margin for future content. Apple’s thinned size report remains the authoritative distribution measurement. Optimize imagery and fonts first; avoid bundling a full video or a large 3D engine. The order-journey `.riv` is about 352 KB. The new combo hero adds a 909 KB Rive scene, three optimized cutouts and matching still poses. The final signed size is checked again on every cloud upload.

## Live Activity boundaries

The demo really uses ActivityKit and WidgetKit. It displays aggregate kitchen progress and supports deep links back to orders. While the app is foregrounded, demo timers and kitchen controls update the activity. iOS can suspend the app in the background; there is no APNs server. A stale activity asks the user to reopen PapuPay rather than presenting a misleading fresh status. Production needs authenticated server-side order state and ActivityKit push updates.

## Apple references

- [Maximum App Clip build sizes](https://developer.apple.com/help/app-store-connect/reference/app-uploads/maximum-build-file-sizes/)
- [Testing the launch experience of your App Clip](https://developer.apple.com/documentation/appclip/testing-the-launch-experience-of-your-app-clip)
- [Offering Live Activities with your App Clip](https://developer.apple.com/documentation/appclip/offering-live-activities-with-your-app-clip)


## Fast demo and ready alerts

At checkout, leave “Daj znać, gdy gotowe” enabled and allow notifications if iOS asks. The first kitchen is ready after 12 seconds; additional kitchens are staggered by 2 seconds, up to 28 seconds for all ten. Lock the phone immediately after placing the demo order to see the notification and Live Activity. Tap the ready notification to return to the correct table's pickup tickets.

The full app schedules local alerts through UserNotifications. The App Clip requests the temporary notification entitlement and accepts Apple's ephemeral authorization; see [Apple's App Clip notification guidance](https://developer.apple.com/documentation/AppClip/enabling-notifications-in-app-clips). This is a short-lived demo permission, not permanent push registration. A finite background task attempts to finish the short Live Activity demo. The OS can still suspend/terminate the app; production needs server-driven APNs updates. Browser alerts require permission and an open tab; the web UI states this limitation.


## Three-kitchen combo

On Discover, watch the ATOM burger gain The Fry fries and Na końcu tęczy ice cream. The one-shot introduction settles; tap the vendor cards or swipe to revisit each stage. With Reduce Motion enabled the matching still pose changes without travel. Choose “Zobacz ten zestaw” / “Explore this combo”, adjust quantities or notes, and explicitly add the selection. The real basket opens with separate kitchen groups. Choose Desserts to find Na końcu tęczy, and check its pickup route to unit 20. Vendor identities and food categories are verified; photography, portions, prices and ice-cream flavors are illustrative.
