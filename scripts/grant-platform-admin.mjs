// Gives a person PapuPay platform admin access to the merchant dashboard,
// creating their account if needed. Platform admins create organisations and
// invite owners, so there's no way to do this from the dashboard itself.
//
//   npm run admin:grant -- person@example.com [pl|en]
//   npm run admin:grant -- person@example.com --revoke
import { existsSync } from "node:fs";
import pg from "pg";
import { supabaseRootCa } from "../src/merchant/supabase-ca.ts";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const [rawEmail, option = "pl"] = process.argv.slice(2);
const email = rawEmail?.trim().toLowerCase();
const revoke = option === "--revoke";
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (!revoke && !["pl", "en"].includes(option))) {
  console.error("Usage: npm run admin:grant -- person@example.com [pl|en|--revoke]");
  process.exit(1);
}

const connection = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connection) throw new Error("Set DIRECT_URL or DATABASE_URL.");
const url = new URL(connection);
url.search = "";
const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
const client = new pg.Client({
  connectionString: url.href,
  ssl: local ? undefined : { ca: supabaseRootCa, rejectUnauthorized: true },
});

await client.connect();
try {
  if (revoke) {
    const { rowCount } = await client.query(
      `UPDATE users SET is_platform_admin = false, updated_at = now() WHERE email = $1`,
      [email],
    );
    console.log(rowCount ? `${email} is no longer a platform admin.` : `No account for ${email}.`);
  } else {
    // Prisma generates ids and updated_at in the app, so supply them here.
    await client.query(
      `INSERT INTO users (id, email, locale, is_platform_admin, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2::"Locale", true, now(), now())
       ON CONFLICT (email) DO UPDATE SET is_platform_admin = true, updated_at = now()`,
      [email, option],
    );
    console.log(`${email} is a platform admin. Sign in at /dashboard/login.`);
  }
} finally {
  await client.end();
}
