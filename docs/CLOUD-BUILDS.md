# Cloud builds and TestFlight

PapuPay can be built, signed and uploaded entirely on GitHub-hosted macOS runners. Local Xcode stays signed out. No signing certificate is installed on the managed development Mac.

## Offline Sweeto demo — prepared 15 November 2026

The next native TestFlight revision adds an offline loyalty demonstration, pre-signed Apple Wallet test cards and supplied test Wi-Fi details, so the missing venue API no longer prevents a walkthrough. The protected environment secret `PAPUPAY_GUEST_DEMO_BASE64` supplies the private resource during the signing step; source control retains a disabled placeholder. See the [demo walkthrough and build controls](NATIVE-DEMO.md). This section describes prepared source and validation, not a confirmed new TestFlight publication.

## Verified signed upload — 28 October 2026

Version **1.0 (10.1)** was signed, exported and uploaded successfully by [GitHub Actions run 40699740687](https://github.com/Ahmad-Alaziz/PapuPay/actions/runs/40699740687), [job 122855989947](https://github.com/Ahmad-Alaziz/PapuPay/actions/runs/40699740687/job/122855989947), from commit `2e48b255a792b77cdbed3106219133f754693754`. **Apple finished processing 10.1, and the existing PapuPay Demo internal group reports Testing.** All four embedded bundle identifiers and versions passed packaging checks; 20 compiled invocation checks passed. That build still contained the Hala Koszyki ordering demo and its Live Activity extensions, which have since been removed: the project now has only the app and the App Clip.

The signed raw App Clip is **11,990,033 bytes (11.990 MB)**, leaving **3,009,967 bytes** under the 15 MB gate. That figure included the Koszyki meal Rive scene, vendor-window images and the Live Activity extension. Apple's thinned size report remains the final distribution measurement.

The dedicated App Manager team API key and distribution key are stored in the four environment secrets below. The `apple-signing` environment allows deployments from `main` only. The certificate and profiles were created successfully and reused by the next run. Local Xcode remains signed out.

## Workflows

- **iOS archive checks** runs on native changes to `main`, pull requests, or manual dispatch. It runs the guest demo resource and loyalty checks, archives the app and App Clip without signing, checks bundle IDs/build numbers/embedded products/privacy manifests, and applies the 15 MB raw App Clip size gate.
- **Upload PapuPay to TestFlight** is manually dispatched from `main` only. It uses the `apple-signing` environment, fetches profiles for exactly the two PapuPay identifiers (`com.papupay.app` and `com.papupay.app.Clip`), reuses a dedicated distribution private key, archives, validates packaging and size, exports, and uploads. It does not submit public App Store releases or external beta review.

Build numbers are `<workflow run number>.<attempt>`. The app and the embedded App Clip use the same number. The version is 1.0. Only reports are uploaded as GitHub artifacts, with seven-day retention; certificates, API keys and provisioning profiles are excluded.

## One-time credential setup

1. Enable App Store Connect API access for the personal Ahmad Alaziz team. Apple requires the Account Holder to accept API terms; approval may not be immediate.
2. Create a dedicated **team** API key named `PapuPay GitHub Actions`, with **App Manager** access. Individual keys cannot use Apple's provisioning endpoints. Team API keys can access all apps on the personal team; Apple does not support limiting them to PapuPay alone. Do not use an employer's team.
3. Put the following in the GitHub repository's **apple-signing environment secrets**, not source files:

| Secret | Value |
| --- | --- |
| `APP_STORE_CONNECT_KEY_IDENTIFIER` | Apple key ID |
| `APP_STORE_CONNECT_ISSUER_ID` | Personal team's API issuer UUID |
| `APP_STORE_CONNECT_PRIVATE_KEY` | Contents of the downloaded `.p8` key |
| `CERTIFICATE_PRIVATE_KEY` | A dedicated 2048-bit RSA PEM private key, reused across builds |

4. Restrict the environment to the `main` branch. The approved key destination is GitHub encrypted environment secrets; no extra local backup copies are created. Apple permits only one `.p8` download. Never paste keys in chat or commit them.
5. Run **Upload PapuPay to TestFlight**. The open-source Codemagic CLI runs on GitHub's runner and communicates with Apple; no Codemagic account/service is used. The first run creates a distribution certificate and the two profiles if necessary. It never revokes existing certificates. If Apple's certificate quota is full, stop and review the team's existing certificates instead of revoking them automatically.

GitHub encrypts secrets at rest. The signing job creates a temporary keychain, then removes its keychain and temporary signing files on exit. The runner is disposable. Only the signing step receives the Apple secrets; PR checks have no signing environment.

## Test on an iPhone

The **PapuPay Demo** internal group contains **two testers**. Build **1.0 (10.1)** is assigned to the group and its verified status is **Testing**. Physical-device installation of 10.1 has not been observed. Automatic group distribution is off, so future builds require explicit assignment. No external beta group or public invitation link is enabled.

Set these App Clip invocations in TestFlight for Sweeto builds (the Koszyki table invocations used by 10.1 no longer exist):

| Title | Invocation URL |
| --- | --- |
| Sweeto · table | https://papupay.com/go/sweeto/table |
| Sweeto · menu | https://papupay.com/go/sweeto/menu |
| Sweeto · counter | https://papupay.com/go/sweeto/counter |

On the iPhone, install TestFlight and accept the invitation to the personal App Store Connect account. Choose the full app or the Clip, then select an invocation. Apple permits one of the full app and Clip on a device at a time. See the [Sweeto demo walkthrough](NATIVE-DEMO.md) for what to test.

App Clip launch inside TestFlight differs from a public Camera QR launch; public domain invocation still needs Apple's released experience. Physical-device visual/performance verification is separate from Apple reporting an installation.

## References

- [GitHub: Apple signing on macOS runners](https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/sign-xcode-applications)
- [Apple: API keys and provisioning permissions](https://developer.apple.com/documentation/appstoreconnectapi/creating-api-keys-for-app-store-connect-api)
- [Apple: TestFlight App Clip invocations](https://developer.apple.com/help/app-store-connect/test-a-beta-version/test-an-app-clip-experience/)
- [Codemagic CLI: signing files](https://github.com/codemagic-ci-cd/cli-tools/blob/master/docs/app-store-connect/fetch-signing-files.md)
