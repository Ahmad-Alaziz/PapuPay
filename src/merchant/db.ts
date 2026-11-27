import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { supabaseRootCa } from "./supabase-ca";

function createClient() {
  const configured = process.env.DATABASE_URL;
  if (!configured) throw new Error("DATABASE_URL is not set.");

  // DATABASE_URL is Supabase's transaction pooler (port 6543). Query parameters
  // such as ?pgbouncer=true are meant for Prisma's old engine; node-postgres
  // doesn't use named prepared statements, so it works with the pooler as is.
  const url = new URL(configured);
  url.search = "";

  // The pooler's certificate chains to Supabase's own root CA, which isn't in
  // the public trust store. Pin it so the connection is encrypted and verified.
  const adapter = new PrismaPg({
    connectionString: url.href,
    ssl: { ca: supabaseRootCa, rejectUnauthorized: true },
    // Serverless functions are short-lived; keep each one's pool small.
    max: 3,
  });
  return new PrismaClient({ adapter });
}

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { papupayDb?: PrismaClient };

export const db = globalForPrisma.papupayDb ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.papupayDb = db;
