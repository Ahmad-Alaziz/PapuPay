# One domain, one table link

## Live routes

| URL | Purpose |
| --- | --- |
| https://papupay.com/ | Coming-soon marketing homepage |
| https://papupay.com/app | Web entry: scan your table or explicitly try the Koszyki demo |
| https://papupay.com/go/koszyki/24 | Canonical printed QR for Koszyki, table 24 |
| https://papupay.com/go/koszyki/37 | Same hall, table 37 |
| https://papupay.com/.well-known/apple-app-site-association | Apple domain association, served as JSON without a redirect |

`www.papupay.com` redirects permanently to the same path on `papupay.com`. Print the apex URL directly. There is no device detection or redirect in the canonical QR route: it serves the ordering document immediately, preserving hall and table.

The QR contract is `/go/{hall-slug}/{table-number}`. The hall is the food court, not an individual restaurant. All kitchens inside that hall are available in one basket, with separate kitchen tickets. An order snapshots both `venueId` and the table; changing the current table does not rewrite previous orders. Table changes in the web demo also update the path, so reloading keeps the selection.

This MVP only supports `koszyki` and table numbers 1–999. That range is demo validation, not an authoritative inventory of real Koszyki tables. Unknown halls, malformed table IDs, duplicate context parameters and conflicting path/query values are rejected. They never silently open another hall/table. Old `/clip?venue=koszyki&table=24` and `/?table=24` demo links remain supported.

## What a scan does

1. **Today, on any phone:** opens the responsive ordering demo with its hall and table already selected.
2. **After the App Clip is published and its experience is active:** a compatible iPhone can show Apple's App Clip card. The customer taps Open; iOS downloads and launches the small Clip. Both native targets parse the same URL.
3. **Full iOS app already installed:** the associated universal link opens the full app with that same context.
4. **Android, unsupported/restricted devices, or a customer who stays in the browser:** the URL serves the web app. No install prompt blocks ordering.

The website cannot silently install an App Clip. Apple's native invocation and the Safari Smart App Banner depend on a signed, uploaded and published app, not just a DNS record. Browser and native demo orders currently remain separate local stores; the production backend must unify them.

## Apple identity and release setup

- Personal developer team: `5W4JVD497D` (Ahmad Alaziz).
- Containing app: `com.papupay.app`.
- App Clip: `com.papupay.app.Clip`, registered with PapuPay as its parent.
- Live Activity extensions: `com.papupay.app.LiveActivity`, `com.papupay.app.Clip.LiveActivity`.
- App Store Connect app: [PapuPay, 6826778125](https://appstoreconnect.apple.com/apps/6826778125/distribution), initially Prepare for Submission, version 1.0.
- Host and Clip include `appclips:papupay.com`; host also includes `applinks:papupay.com`.
- The AASA file identifies the real Clip and containing app. Only `/go/*` and the legacy `/clip` route are universal links; the marketing homepage stays a website.
- The QR HTML has Apple's Smart App Banner metadata with the real app ID. The homepage and `/app` chooser omit it. It becomes effective only after Apple's remaining publishing requirements are met.

All four bundle identifiers are registered. The current managed Mac blocks personal Apple Account sign-in in Xcode, so signing and upload must happen on a personal Mac or an approved build environment. No signed build has been uploaded from this machine.

After uploading a build containing the Clip, configure the required default App Clip experience. Then create an **advanced experience for `https://papupay.com/go/koszyki/`**. Apple uses the most specific URL prefix, so one hall experience covers every table. Use a Koszyki-specific header and subtitle; the exact table comes from the full invocation URL, not the static App Clip card. Do not register each table as a separate experience.

Suggested card copy: title `PapuPay`, subtitle `Smaki Hali Koszyki. Jeden koszyk.`, action `Open`. The location may be associated with Hala Koszyki after the concept has venue authorization. This MVP must not claim an official partnership.

For testing before App Store release: install a development-signed Clip and register a local experience on the iPhone, or upload and use TestFlight's App Clip invocation testing. Public printed-QR App Clip activation still requires Apple review and release. See [iPhone testing](IPHONE-TESTING.md).

## Adding more food halls later

Keep each hall slug stable. Add a backend registry of halls, active tables, restaurants and menu availability, and resolve the URL against it before checkout. Namespace carts by hall. If a new scan changes halls, explicitly switch the session and ask before discarding the previous hall's basket. Keep old tickets linked to their original hall/table. Changing physical table labels should update their registry mapping, not repurpose an existing QR for an unrelated hall.

For production, replace guessable demo table numbers with opaque table tokens if appropriate, resolve them server-side, validate table availability again at checkout, and create server-authoritative orders. A QR establishes table context, not authentication or proof that the customer is physically present. Build the staff/POS connection, payment integration and push updates against those orders.

## DNS

Namecheap BasicDNS remains authoritative. Only the original website parking/redirect records were changed:

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| A | @ | 216.198.79.1 | 30 min |
| CNAME | www | 2fcb2930e95c2df0.vercel-dns-017.com. | 30 min |

Vercel supplied these values for the existing `papupay` project. Email forwarding and its SPF record were preserved. Vercel manages HTTPS certificates.

## Sources

- [Apple: configuring App Clip experiences and URL prefix matching](https://developer.apple.com/documentation/appclip/configuring-the-launch-experience-of-your-app-clip)
- [Apple: associating an App Clip with a website](https://developer.apple.com/documentation/appclip/associating-your-app-clip-with-your-website)
- [Apple: website invocations and Smart App Banners](https://developer.apple.com/documentation/appclip/supporting-invocations-from-your-website-and-the-messages-app)
- [Vercel: adding a custom domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
