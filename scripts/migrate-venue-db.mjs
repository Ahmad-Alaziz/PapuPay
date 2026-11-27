import { existsSync } from "node:fs";
import { createDatabase } from "../server/postgres.mjs";
import { migrateVenue } from "../server/database-migrations.mjs";
import { loadVenues, venueRegistry } from "../server/venues.mjs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const args = process.argv.slice(2);
const demo = args[0] === "--demo";
if (args.length > Number(demo)) throw new Error("Usage: npm run db:migrate -- [--demo]");

const env = process.env;
if (demo && (!env.PAPUPAY_DEMO_DATABASE_URL || env.PAPUPAY_DEMO_DATABASE_URL === env.DATABASE_URL)) {
  throw new Error("Set PAPUPAY_DEMO_DATABASE_URL to a separate local PostgreSQL database.");
}
const url = demo ? env.PAPUPAY_DEMO_DATABASE_URL : env.PAPUPAY_MIGRATION_DATABASE_URL ?? env.DATABASE_URL;
const database = createDatabase(url, { namespace: demo ? "papupay_demo" : "papupay" });
try {
  for (const id of venueRegistry(loadVenues(env.PAPUPAY_VENUES_FILE, env.PAPUPAY_VENUES_JSON)).keys()) {
    const applied = await migrateVenue(database, id);
    console.log(`${id}: ${applied.length ? applied.join(", ") : "up to date"}`);
  }
} finally {
  await database.close();
}
