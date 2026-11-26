# Venue configuration and Wallet passes

Sweeto is the built-in venue. To operate another venue on the same server, point `PAPUPAY_VENUES_FILE` to a JSON file containing the list of approved venue definitions. Use distinct lower-case IDs. Each venue uses its own SQLite database and cookies. The `/api/*` compatibility routes continue to resolve to Sweeto.

```json
[
  {
    "id": "counter-a",
    "name": "Counter A",
    "address": "Venue address",
    "logoUrl": "/assets/counter-a/logo.png",
    "logoWhiteUrl": "/assets/counter-a/logo-white.png",
    "photoUrl": "/assets/counter-a/hero.webp",
    "menuFallback": "/assets/counter-a/menu.pdf",
    "theme": { "motionTheme": "berry" }
  }
]
```

Use `PAPUPAY_VENUE_COUNTER_A_DB` for its absolute database path. The same prefix accepts `STAFF_PIN`, `MANAGER_PIN`, `GOOGLE_REVIEW_URL`, `MENU_PDF_PL_URL`, `MENU_PDF_EN_URL`, `MENU_PDF_RU_URL`, `WIFI_SSID`, `WIFI_PASSWORD`, `WIFI_SECURITY` and `WIFI_HIDDEN`. Optional public values include `mapUrl`, `menuImageUrl`, and palette overrides for `background`, `surface`, `ink`, `accent` and `muted`. The motion presets are `sweeto`, `berry` and `forest`. `GET /api/venues` lists venue brands, and `GET /api/v/<id>/venue` returns the configuration for one venue.

The `theme.font` setting accepts `bricolage`, `dm-sans`, `manrope`, `serif` or `system`, with language-appropriate fallbacks. Photos and logos may use local assets or HTTPS URLs. Keep the full product inside the source frame: the homepage fits the entire image instead of cropping it. Each motion preset includes matching animated colors and reduced-motion stills. Additional custom motion palettes need corresponding Rive instance colors and fallback artwork.

`photoMotion: "sauce-drip"` enables one shared motion preset on the web and iOS. Use a transparent square WebP with the food resting in a horizontal sauce pool. Leave clear space above the food and let the pool reach near the bottom edge. Set `photoDrip.x` to the spill center (0.10–0.90), `y` to the image row that meets the card edge (0.80–1.00, default 1), and `width` to the lip width (0.01–0.20, default 0.04). These values are fractions of the source image dimensions. Set `color` to the six-digit hex color sampled at that lip. Both clients align the source row to the card edge and crop only the small portion below it. A shallow meniscus, slow pinch and dense settling drop share a 6.4-second loop; only the small sauce layer moves. Here is a burger example:

```json
{
  "photoUrl": "/assets/burger-shop/sauce-burger.webp",
  "photoMotion": "sauce-drip",
  "photoDrip": { "x": 0.74, "y": 0.99, "width": 0.07, "color": "#d48938" }
}
```

Changing these values changes the picture and the drop without editing animation code. A different motion sequence can be added as a separate preset. Leave the preset out for a still photo or set `photoMotion` to `null` to disable Sweeto’s default. The browser and iOS show the still artwork with Reduce Motion.

Venue configuration currently comes from the server registry; a self-service vendor editor or photo uploader has not been built. A future editor can write this same configuration without changing the customer navigation or requiring one app per venue.

## Service hosting

Set `PAPUPAY_API_ORIGIN` on the Next.js host to the HTTPS origin of the Node service. Start that service with `npm run venue:serve`, `NODE_ENV=production` and `PAPUPAY_DB` pointing to Sweeto’s absolute SQLite file on a persistent volume. Additional venues require their own absolute database paths. Mount any Wallet signing material privately on the same host. The service listens on loopback by default. Configure `HOST` and `PORT` for the reverse proxy or hosting environment serving it.

The website forwards guest, staff and Wallet requests under their existing public paths and returns venue session cookies to the same browser. The service handles ledger transactions and Wallet update delivery. An unavailable service returns a retryable error. The menu and device-local counter list can still be used. A production service does not start with an in-memory or implicit database. Set `PAPUPAY_DEMO=1` only for an isolated local demo.

## Test checkout

With `PAPUPAY_DEMO=1` in development, the Test Lab can use each venue’s default `-demo.sqlite` ledger or an isolated `:memory:` database. Each mock scan verifies that the presented QR alias or short code belongs to the browser’s guest card. Retried requests preserve the transaction result and six stamps enable a test redemption. Test mutations and the built-in staff PINs are disabled for custom persistent database paths and production.

## Apple Wallet

Configure the Pass Type ID, Apple Developer team and server signing credentials as environment variables. Run the server with OpenSSL on its `PATH`.

| Environment variable | Value |
| --- | --- |
| `PAPUPAY_WALLET_PASS_TYPE_ID` | Registered Pass Type ID such as `pass.com.example.loyalty` |
| `PAPUPAY_WALLET_TEAM_ID` | Ten-character Apple Developer team ID |
| `PAPUPAY_WALLET_P12_PATH` | Private server path to the exported Pass Type ID certificate and private key |
| `PAPUPAY_WALLET_P12_PASSWORD` | Password for the P12 export |
| `PAPUPAY_WALLET_WWDR_PATH` | Official Apple WWDR G4 intermediate certificate in PEM or DER format |
| `PAPUPAY_WALLET_ORIGIN` | Origin for the link back to the browser card, default `https://papupay.com` |
| `PAPUPAY_WALLET_OPENSSL` | Optional path to a specific OpenSSL executable |
| `PAPUPAY_WALLET_WEBSERVICE_ORIGIN` | Optional public HTTPS origin serving the Wallet update protocol |
| `PAPUPAY_WALLET_RECOVERY_ORIGIN` | Optional public HTTPS origin serving the card recovery page |
| `PAPUPAY_RECOVERY_SECRET` | Optional persistent recovery signing secret generated from at least 32 random bytes |

Keep the P12, its password and recovery secret outside source control. Restart the service after changing signing credentials. The service checks the certificate against the configured type and team, the private key and Apple’s official WWDR G4 intermediate before it offers a download. Add to Wallet downloads a store card with the same QR alias as the browser card. Without an update origin, the installed card shows the stamp count at download. The original pass continues to work at checkout. A fresh download uses the same serial number and replaces the saved copy. [Apple certificate setup](https://developer.apple.com/help/account/capabilities/create-wallet-identifiers-and-certificates) · [Apple WWDR certificate list](https://www.apple.com/certificateauthority/) · [Apple pass format](https://developer.apple.com/documentation/walletpasses/building-a-pass)

Without qualifying credentials the app can preview a card. It serves a `.pkpass` only after it can sign it with the configured Pass Type ID key. Apple Wallet installation still requires a device check with the actual developer certificate. [Apple pass distribution](https://developer.apple.com/documentation/walletpasses/distributing-and-updating-a-pass)

The App Clip uses Apple's native Wallet control. The website keeps a text link to the signed pass. An authorized Apple Developer account representative can download Apple’s approved badge artwork and add the unmodified localized SVGs as `apple-en.svg`, `apple-pl.svg` and `apple-ru.svg` under `public/assets/wallet/`. The web build detects these files and shows the matching badge when the Apple pass is available on an Apple device. [Apple badge guidelines and license](https://developer.apple.com/wallet/add-to-apple-wallet-guidelines/)

## Google Wallet

In the Google Wallet Business Console, authorize a Google Cloud service account for the issuer and publish an approved Loyalty Class for each participating venue. Use its venue name, pass artwork and terms. [Issuer onboarding](https://developers.google.com/wallet/retail/loyalty-cards/getting-started/issuer-onboarding) · [Loyalty Class format](https://developers.google.com/wallet/reference/rest/v1/loyaltyclass)

| Environment variable | Purpose |
| --- | --- |
| `PAPUPAY_GOOGLE_WALLET_SERVICE_ACCOUNT_PATH` | Path to the private service account JSON key on the server |
| `PAPUPAY_GOOGLE_WALLET_CLASS_ID` | Sweeto’s approved class ID, including the numeric issuer prefix |
| `PAPUPAY_VENUE_<ID>_GOOGLE_WALLET_CLASS_ID` | Another venue’s approved class ID for the same service account |
| `PAPUPAY_GOOGLE_WALLET_ORIGIN` | Optional HTTPS web origin for signed links. Defaults to `https://papupay.com`. |

Keep the service account key outside source control and restart the Node service after changing credentials. The Wallet status reports Google availability separately from Apple based on the local configuration. An authenticated card owner can request a signed Google save link with `POST /api/v/<id>/loyalty/google-wallet`. The pass has a stable object ID and carries the existing checkout QR code and membership number. Staff see the live balance when they scan it. Guests check stamp balances in PapuPay. [Google save-link flow](https://developers.google.com/wallet/retail/loyalty-cards/web)

The App Clip and web open Google’s save flow so the guest can choose a Google account. On Android the web checkout offers Google Wallet first. Apple devices get the Apple action first and can choose Google Wallet on the Wallet page when both are available. Save the pass with an authorized account, then use an Android device to show the pass QR at the counter. The offline TestFlight demo uses its bundled Apple Wallet passes.

## Live Wallet updates

Set `PAPUPAY_WALLET_WEBSERVICE_ORIGIN` after the Node service is reachable there by HTTPS. A new download includes that venue’s `/api/v/<id>/wallet` base URL and an authentication token generated for the pass. Apple Wallet registers the device with this route. A stamp, redemption or correction updates the pass revision in the same SQLite transaction as the ledger. A background worker sends an empty update signal through production APNs with the existing Pass Type ID certificate. The device retrieves the signed replacement. Transient delivery failures are retried and invalid device tokens are removed. Preserve the database and its owner-only permissions across restarts. [Apple pass update service](https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes)

A pass downloaded before updates were enabled must be downloaded once more to register. Verify installation, successful registration and a change in Wallet after a real stamp on an iPhone. Automated tests verify the HTTP protocol, durable queue, authentication and APNs request shape with a test transport. They do not send notifications to real devices.

## Recover a card into another browser

Set `PAPUPAY_RECOVERY_SECRET` and `PAPUPAY_WALLET_RECOVERY_ORIGIN` to include a restoration link in new passes. Keep the secret stable across restarts and separate from the Wallet signing password. The link has a recovery token in its URL fragment. Its page previews the card and asks for confirmation before the server creates a new browser session. The recovery token is independent of the checkout QR and Apple’s update token. A copied recovery link grants access to the card if confirmed. It expires after one year and the authenticated card owner can revoke it with `POST /api/v/<id>/loyalty/restore/revoke`. Revoking a link leaves existing sessions active.

In an isolated Test Lab with the secret configured, `POST /api/v/<id>/test/restore-link` creates a local recovery link and expires that browser’s current cookie. The restored browser receives the same membership and checkout QR. This simulation does not require a public recovery origin and does not add a recovery link to the downloadable Wallet pass. The public origins remain opt-in and are unset in the local preview.
