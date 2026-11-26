# Offline Sweeto demo for TestFlight

The native app and App Clip can demonstrate the complete Sweeto loyalty flow without a running venue API. This is an explicitly enabled internal demo. It does not create a production membership or a real reward.

## Customer walkthrough

1. Open Sweeto, then **Twoja karta** and create the demo card.
2. Use **Wypróbuj skanowanie** to simulate the counter scan. A short scanning state resolves to a new stamp and visible confirmation.
3. Collect six stamps, confirm the test reward, and continue collecting on the same card. A retry cannot add the same scan twice or redeem the same reward again.
4. Leave and return to the card to check that its progress remains saved. The demo ledger is stored locally and separately from server memberships, scoped to service origin, venue and demo identity.
5. Add the card with the official Apple Wallet sheet. After changing the stamp balance or redeeming, add it again to refresh the Wallet copy. Seven pre-signed states cover zero through six stamps with one serial number and QR identity. There is no automatic Wallet update service in this offline demo.
6. Open Wi-Fi to view the supplied test network and use the native join action. iOS requests consent; joining succeeds only when the network is in range. Manual details remain available. A simulator cannot demonstrate the physical Wi-Fi join.

The copy and controls support Polish, English and Russian. The card and its Wallet pass identify themselves as a demo. The test scan is a simulation and does not require the camera or a second device.

## Homepage motion

The Sweeto home opens directly into its dessert photograph and four venue actions. The PapuPay fruit makes a single Rive entrance at the bottom before settling next to the wordmark. Direct menu and counter links skip the entrance. Reduce Motion shows the settled mark. On the guest card, an observed new stamp makes a single ink impression while the QR stays in place.

On a home launch the system PapuPay lockup hands off to a short animated reveal. The restored home uses the Matylda close-up and the original Rive fruit entrance. In the dessert menu, the tasting dial follows a drag or a tap on a labelled flavour, then shows the matching dessert to add to the counter list. Reduce Motion keeps the still artwork and selection controls.

When a live member loses connectivity, the App Clip can show their last saved checkout QR. It labels the cached balance and requires an online check to confirm rewards.

## Private build configuration

Source control contains only `apps/ios/Resources/GuestDemo.plist` with `enabled: false`. The protected `apple-signing` environment can provide `PAPUPAY_GUEST_DEMO_BASE64` to the manually run TestFlight workflow. It is a base64-encoded binary property list, optionally compressed with gzip, containing:

- `enabled`, `venueId`, `cardCode` and `checkout`;
- `wifi` with the approved test network details;
- `walletPasses`, seven signed pass files stored as property-list Data values.

The signing step validates and decodes the resource before archiving, unsets the secret environment variable, and restores the disabled source resource afterward. The 48 KB secret and 512 KB decompressed payload limits are checked. Logs and packaging artifacts exclude the private resource contents. Signing keys are not bundled.

The runtime loader accepts this demo only for Sweeto and the designated demo identity. Removing the encrypted environment secret produces a new build with the demo disabled. Build a fresh release with it disabled before public distribution; do not promote a private internal demo binary to the App Store.

## Verification status

The November 26 unsigned archive passed for the app and embedded Clip. The raw Clip measured 8.778 MB, below its 15 MB gate. All seven passes passed manifest hashes, CMS signatures, Apple certificate-chain verification and native macOS PassKit parsing. Checks cover disabled/enabled resource handling, wrong-venue isolation, bounded decompression, card creation, retry protection, six-stamp limits, redemption, local persistence and the next reward cycle.

The simulator walkthrough verified card creation, six scans, confirmed redemption back to zero stamps, retained progress after reinstall, the signed pass in Apple’s Add to Wallet sheet, and populated Wi-Fi details with a manual fallback. Physical-device installation, the Wi-Fi consent/join result and Wallet behavior must also be checked through the next assigned TestFlight build. Publication status is recorded separately after upload and group assignment.
