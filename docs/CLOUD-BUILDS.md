# Cloud builds and TestFlight

PapuPay can be built, signed and uploaded entirely on GitHub-hosted macOS runners. Local Xcode stays signed out. No signing certificate is installed on the managed development Mac.

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

4. Restrict the environment to the `main` branch. Store private keys in the owner's secure credential storage as well; Apple permits only one `.p8` download. Never paste keys in chat or commit them.
5. Run **Upload PapuPay to TestFlight**. The open-source Codemagic CLI runs on GitHub's runner and communicates with Apple; no Codemagic account/service is used. The first run creates a distribution certificate and four profiles if necessary. It never revokes existing certificates. If Apple's certificate quota is full, stop and review the team's existing certificates instead of revoking them automatically.

GitHub encrypts secrets at rest. The signing job creates a temporary keychain, then removes its keychain and temporary signing files on exit. The runner is disposable. Only the signing step receives the Apple secrets; PR checks have no signing environment.

## Test on an iPhone

After Apple finishes processing, open [PapuPay TestFlight](https://appstoreconnect.apple.com/apps/6826778125/testflight/ios). Add the account holder as an internal tester. On the build, add App Clip invocations for `https://papupay.com/go/koszyki/24` and `https://papupay.com/go/koszyki/37`. Install TestFlight on the iPhone, then choose the app or the Clip. App Clip launch inside TestFlight differs from a public Camera QR launch; public domain invocation still needs Apple's released experience.

## References

- [GitHub: Apple signing on macOS runners](https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/sign-xcode-applications)
- [Apple: API keys and provisioning permissions](https://developer.apple.com/documentation/appstoreconnectapi/creating-api-keys-for-app-store-connect-api)
- [Apple: TestFlight App Clip invocations](https://developer.apple.com/help/app-store-connect/test-a-beta-version/test-an-app-clip-experience/)
- [Codemagic CLI: signing files](https://github.com/codemagic-ci-cd/cli-tools/blob/master/docs/app-store-connect/fetch-signing-files.md)
