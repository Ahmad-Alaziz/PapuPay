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

On a home launch the system PapuPay lockup hands off to a short animated reveal. The compact photo panel shows the blue Sweeto takeaway box above four full-width actions. The PapuPay fruit plays its original Rive entrance at the footer.

When a live member loses connectivity, the App Clip can show their last saved checkout QR. It labels the cached balance and requires an online check to confirm rewards.

## Private build configuration

The checked-in `GuestDemo.plist` has `enabled: false`. The protected `apple-signing` environment supplies the original demo through `PAPUPAY_GUEST_DEMO_BASE64`, a base64-encoded binary property list with optional gzip compression.

- `enabled`, `venueId`, `cardCode` and `checkout`;
- `wifi` with the approved test network details;
- `walletPasses`, seven signed pass files stored as property-list Data values.

The signing step verifies each original pass, then rebuilds all seven states from the current artwork, the protected card identity and the detached CMS signatures in `scripts/ci/guest-wallet-signatures/`. It verifies every manifest and uses the signer from the protected passes to authenticate the rebuilt files. Only the internal app bundle receives the private demo, and the step restores the disabled source resource after archiving. The original secret is limited to 48 KiB encoded and 512 KiB after decompression.

When the pass template changes, use the local Wallet signer and the original protected demo configuration to run `python3 scripts/ci/regenerate-guest-wallet.py --signatures scripts/ci/guest-wallet-signatures`. This checks that all seven pass archives reproduce exactly before writing their detached signatures. Only those signatures belong in source control. The pass type, serial number and checkout QR stay the same across stamp states. Each pass links to its own saved demo stamp count.

The runtime loader accepts this demo only for Sweeto and the designated demo identity. Removing the encrypted environment secret produces a new build with the demo disabled. Build a fresh release with it disabled before public distribution; do not promote a private internal demo binary to the App Store.

## Verification status

The November 26 unsigned archive passed for the app and embedded Clip. The raw Clip measured 8.778 MB, below its 15 MB gate. All seven passes passed manifest hashes, CMS signatures, Apple certificate-chain verification and native macOS PassKit parsing. Checks cover disabled/enabled resource handling, wrong-venue isolation, bounded decompression, card creation, retry protection, six-stamp limits, redemption, local persistence and the next reward cycle.

For the Sweeto poster and legacy store-card design, Node 22.14.0 and 22.21.1 reproduced the complete signed demo resource byte for byte. Apple PassKit read the balance from all seven passes. Each kept the original checkout QR, Warsaw coordinates and matching recovery links in English, Polish and Russian. The passes measured 182,074–182,250 bytes each. The bundled property list measured 1,275,890 bytes. Each rebuilt pass has a 256 KiB size limit, and the complete App Clip still goes through the archive size check.

The simulator walkthrough verified card creation, six scans, confirmed redemption back to zero stamps, retained progress after reinstall, the signed pass in Apple’s Add to Wallet sheet, and populated Wi-Fi details with a manual fallback. Physical-device installation, the Wi-Fi consent/join result and Wallet behavior must also be checked through the next assigned TestFlight build. Publication status is recorded separately after upload and group assignment.
