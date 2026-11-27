# Merchant dashboard

`/dashboard` is where venue owners and managers configure what their guests see in the App Clip and the Android web app. PapuPay onboards each client by hand, so there's no public sign-up.

## Setup

1. Copy the Supabase values into `.env.local`: `DATABASE_URL` (transaction pooler, port 6543), `DIRECT_URL` (session pooler, port 5432) and the `SUPABASE_*` keys. See `.env.example`.
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

## Sign-in

- Sign-in links are single-use and expire after 15 minutes. Invitations expire after 7 days, and a new invitation to the same address replaces the old one.
- Opening a link only shows a button; signing in or accepting is a separate POST, so email scanners that open links can't use them up.
- The login form answers the same way whether or not an address has access. Each address gets at most 3 links per 15 minutes.
- Only SHA-256 hashes of link and session tokens are stored. Sessions last 30 days in an `HttpOnly`, `SameSite=Lax` cookie (`__Host-` prefixed in production), and signing out deletes the session.
- Email links use `NEXT_PUBLIC_SITE_URL` (or the Vercel URL), never the request's Host header.
- Every sign-in, invitation and membership change is recorded in `audit_logs`.
