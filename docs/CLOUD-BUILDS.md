# Cloud builds and TestFlight

PapuPay can be built, signed and uploaded entirely on GitHub-hosted macOS runners. Local Xcode stays signed out. No signing certificate is installed on the managed development Mac.

## Verified delivery — 25 October 2026

Version **1.0 (8.1)** was signed, exported and uploaded successfully by [GitHub Actions run 40219410134](https://github.com/Ahmad-Alaziz/PapuPay/actions/runs/40219410134), from commit `dfff323971ce4e1024fd97f73b35be5780316c2b`. Apple finished processing the build. All four embedded bundle identifiers and versions passed packaging checks; 20 compiled invocation checks passed. The signed raw App Clip is **11,037,954 bytes (11.038 MB)** against the 15 MB gate, including the new Rive combo scene and its Live Activity extension. The final signed reports are preserved in `docs/verification/v7-signed-clip-size.json` and `v7-signed-archive-summary.json`. Earlier reports remain for provenance. Apple's thinned size report remains the final distribution measurement.

The dedicated App Manager team API key and distribution key are stored in the four environment secrets below. The `apple-signing` environment allows deployments from `main` only. The certificate and four profiles were created successfully and reused by the next run. Local Xcode remains signed out.

## Workflows

- **iOS archive checks** runs on native changes to `main`, pull requests, or manual dispatch. It compiles the invocation checks, archives all four targets without signing, checks bundle IDs/build numbers/embedded products/privacy manifests, and applies the 15 MB raw App Clip size gate.
- **Upload PapuPay to TestFlight** is manually dispatched from `main` only. It uses the `apple-signing` environment, fetches profiles for exactly the four PapuPay identifiers, reuses a dedicated distribution private key, archives, validates packaging and size, exports, and uploads. It does not submit public App Store releases or external beta review.

Build numbers are `<workflow run number>.<attempt>`. Both the app and all embedded products use the same number. The version is 1.0. Only reports are uploaded as GitHub artifacts, with seven-day retention; certificates, API keys and provisioning profiles are excluded.

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
5. Run **Upload PapuPay to TestFlight**. The open-source Codemagic CLI runs on GitHub's runner and communicates with Apple; no Codemagic account/service is used. The first run creates a distribution certificate and four profiles if necessary. It never revokes existing certificates. If Apple's certificate quota is full, stop and review the team's existing certificates instead of revoking them automatically.

GitHub encrypts secrets at rest. The signing job creates a temporary keychain, then removes its keychain and temporary signing files on exit. The runner is disposable. Only the signing step receives the Apple secrets; PR checks have no signing environment.

## Test on an iPhone

The **PapuPay Demo** internal group contains the account holder and the latest build **1.0 (8.1)**. Its verified status is **Testing**. Physical-device installation of 8.1 has not been observed. Automatic group distribution is off, so future builds require explicit assignment. No external beta group or public invitation link is enabled.

The build has saved Polish test instructions and two App Clip invocations:

| Title | Invocation URL |
| --- | --- |
| Koszyki · 24 | https://papupay.com/go/koszyki/24 |
| Koszyki · 37 | https://papupay.com/go/koszyki/37 |

Open [PapuPay TestFlight](https://appstoreconnect.apple.com/apps/6826778125/testflight/ios) to manage the build. On the iPhone, install TestFlight and accept the invitation to the personal App Store Connect account. Choose the full app or the Clip, then select a table invocation. Apple permits one of the full app and Clip on a device at a time. See [iPhone testing](IPHONE-TESTING.md) for the demo checklist.

App Clip launch inside TestFlight differs from a public Camera QR launch; public domain invocation still needs Apple's released experience. Physical-device visual/performance verification is separate from Apple reporting an installation.

## References

- [GitHub: Apple signing on macOS runners](https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/sign-xcode-applications)
- [Apple: API keys and provisioning permissions](https://developer.apple.com/documentation/appstoreconnectapi/creating-api-keys-for-app-store-connect-api)
- [Apple: TestFlight App Clip invocations](https://developer.apple.com/help/app-store-connect/test-a-beta-version/test-an-app-clip-experience/)
- [Codemagic CLI: signing files](https://github.com/codemagic-ci-cd/cli-tools/blob/master/docs/app-store-connect/fetch-signing-files.md)
