# Testing on your iPhone

## Fastest: the web demo

Open **https://papupay.vercel.app/?table=24** on your phone, or scan `docs/testing/hosted-web-table-24.png`. No installation or shared Wi-Fi is needed. This is the hosted React demo; native App Clip testing is described below.

For local development, run the production preview on the Mac:

```sh
npm run build
npm run preview -w apps/web -- --host 0.0.0.0 --port 4173
```

Connect the phone and Mac to the same Wi-Fi. Open the network address Vite prints, adding `?table=24`. At handoff the address was `http://192.168.1.73:4173/?table=24`; it may change with Wi-Fi. The generated QR in `docs/testing/web-table-24.png` points to that address. This tests the React app, not native App Clip invocation. Camera scanning is performed by the phone’s Camera app; PapuPay itself requests no camera permission.

Android and other browsers use the same hosted responsive web app. Deployment details are recorded in `docs/DEPLOYMENT.md`.

## Native app and App Clip from Xcode

1. Open `apps/ios/PapuPay.xcodeproj`. Let Swift Package Manager resolve Rive 6.27.0.
2. Connect your iPhone, trust the Mac if needed, and enable Developer Mode on the phone.
3. Under Signing & Capabilities select your Apple development team for **all four targets**: PapuPay, PapuPayClip, PapuPayLiveActivity, PapuPayClipLiveActivity.
4. Use bundle identifiers available to your team. If changing the base `com.papupay.demo`, also update the host’s associated App Clip identifier and Clip’s parent-application entitlement. Preserve the hierarchy: host, host.Clip, host.LiveActivity, host.Clip.LiveActivity.
5. Select the physical device and run **PapuPayClip**. Its scheme supplies `_XCAppClipURL=https://papupay.example/clip?venue=koszyki&table=24`.
6. Change the scheme environment URL’s table parameter to 37 and run again to confirm invocation context. The simulator verification used the actual Clip bundle and table 37.
7. Place a demo order, allow Live Activities if iOS asks, then lock the phone. Inspect the activity; on supported phones also inspect Dynamic Island. Return to PapuPay or use the demo-ready button to advance status.

**Current signing limitation:** this Mac reported zero valid code-signing identities during verification. Simulator and unsigned device builds succeed, but a signed physical iPhone installation was not performed. An Apple team/certificate is required; no account or signing credentials were created or changed.

## Test the actual scan-to-App-Clip card

An arbitrary QR pointing to an unassociated URL will open Safari. A URL parameter alone does not register an App Clip experience.

For local development, install/run the signed Clip once, then use iPhone **Settings → Developer → Local Experiences** to register a local App Clip experience matching the test invocation URL and Clip bundle identifier. Configure the title, subtitle, action and image. Scan the matching QR with Camera. Apple’s local experience workflow allows testing before an App Store release and before configuring an associated website.

`docs/testing/clip-table-24.png` contains the exact example invocation URL. It is for a registered **local experience**, not a deployed association. `papupay.example` is a reserved placeholder; no production ownership is claimed.

For distribution, configure your owned HTTPS domain, App Clip experience in App Store Connect, associated-domain entitlements, and an `apple-app-site-association` file containing your real Team ID and bundle identifiers. `docs/testing/apple-app-site-association.example.json` is a template, not a live association. Archive/upload the containing PapuPay app, then use the supported TestFlight App Clip testing flow.

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

See `docs/verification/clip-size.json` for the measured build. Keep enough margin for signing and future content. The final signed Xcode archive / App Store thinned size report remains authoritative. Optimize imagery and fonts first; avoid bundling a full video or a large 3D engine. The custom `.riv` is about 348 KB.

## Live Activity boundaries

The demo really uses ActivityKit and WidgetKit. It displays aggregate kitchen progress and supports deep links back to orders. While the app is foregrounded, demo timers and kitchen controls update the activity. iOS can suspend the app in the background; there is no APNs server. A stale activity asks the user to reopen PapuPay rather than presenting a misleading fresh status. Production needs authenticated server-side order state and ActivityKit push updates.

## Apple references

- [Maximum App Clip build sizes](https://developer.apple.com/help/app-store-connect/reference/app-uploads/maximum-build-file-sizes/)
- [Testing the launch experience of your App Clip](https://developer.apple.com/documentation/appclip/testing-the-launch-experience-of-your-app-clip)
- [Offering Live Activities with your App Clip](https://developer.apple.com/documentation/appclip/offering-live-activities-with-your-app-clip)
