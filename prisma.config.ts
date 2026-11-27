import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js reads .env.local; the Prisma CLI does not, so load it here too.
loadEnv({ path: ".env.local", override: false, quiet: true });

// Migrations use the session pooler (DIRECT_URL, port 5432). The app itself
// connects through the transaction pooler (DATABASE_URL) in src/merchant/db.ts.
// `prisma generate` needs no database, so builds without DIRECT_URL still work.
const url = process.env.DIRECT_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  ...(url ? { datasource: { url } } : {}),
});
