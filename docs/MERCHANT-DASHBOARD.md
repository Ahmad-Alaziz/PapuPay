# Merchant dashboard

`/dashboard` is where venue owners and managers configure what their guests see in the App Clip and the Android web app. PapuPay onboards each client by hand, so there's no public sign-up.

## Setup

1. Copy the Supabase values into `.env.local`: `DATABASE_URL` (transaction pooler, port 6543), `DIRECT_URL` (session pooler, port 5432) and the `SUPABASE_*` keys. Generate `PAPUPAY_SECRETS_KEY` as described in `.env.example`, and use the same value in every environment that shares the database. See `.env.example`.
2. Apply the schema: `npm run db:deploy`. During development, `npx prisma migrate dev --name <change>` creates a migration, and `npm run db:generate` refreshes the client.
3. Make yourself a platform admin: `npm run admin:grant -- you@example.com pl`. Undo it with `--revoke`.
4. Start the app and sign in at `/dashboard/login`.

Without Mailjet keys, `npm run dev` prints sign-in and invitation links to the server console instead of emailing them. Production refuses to send without them.

Prisma manages only the `public` schema. The venue API keeps its own per-venue schemas in the same database, migrated by `npm run db:migrate`.

## Roles

| Role | Can do |
| --- | --- |
| Platform admin | PapuPay team. Creates organisations and their first venue, invites the owner, and can open any organisation as an owner. |
| Owner | Everything in their organisation, including adding and removing owners. An organisation always keeps at least one owner. |
| Manager | All venue settings and publishing. Invites and removes staff. |
| Staff | No dashboard settings. Signs in for the counter screen (not built yet). |

Nobody can change their own role or remove themselves.

## Venue settings

Owners and managers edit each venue under `/dashboard/venues/<slug>/`:

| Page | Draft fields | Guest app field |
| --- | --- | --- |
| Branding | Name, address, Google Maps link, banner photo, logo, white logo, colour theme, font | `name`, `address`, `mapUrl`, `photoUrl`, `logoUrl`, `logoWhiteUrl`, `theme` |
| Wi-Fi | Network name, security, password, hidden | `wifi` (the password is served separately) |
| Google reviews | Review link | `reviewUrl` |
| Menu | PDF per language: Polish, English, Russian | `menuPdf` |

Everything is a draft in `venue_settings` until the Publish step sends it to the guest apps. Review, map and Wi-Fi values follow the same rules as `server/api.mjs` and `server/venues.mjs`, so the guest apps accept anything the dashboard saves.

- Wi-Fi passwords are encrypted with AES-256-GCM using `PAPUPAY_SECRETS_KEY`, bound to the venue. Changing the key makes saved passwords unreadable.
- Files go from the browser straight to the public `venue-assets` bucket with a signed upload URL. The server then checks the stored size, type and file signature before attaching the file, and deletes files that fail. Images up to 5 MB, PDFs up to 15 MB.
- Replacing or removing a file keeps the stored original, since a published release may still point at it.

## Sign-in

- Sign-in links are single-use and expire after 15 minutes. Invitations expire after 7 days, and a new invitation to the same address replaces the old one.
- Opening a link only shows a button; signing in or accepting is a separate POST, so email scanners that open links can't use them up.
- The login form answers the same way whether or not an address has access. Each address gets at most 3 links per 15 minutes.
- Only SHA-256 hashes of link and session tokens are stored. Sessions last 30 days in an `HttpOnly`, `SameSite=Lax` cookie (`__Host-` prefixed in production), and signing out deletes the session.
- Email links use `NEXT_PUBLIC_SITE_URL` (or the Vercel URL), never the request's Host header.
- Every sign-in, invitation and membership change is recorded in `audit_logs`.
