import { DatabaseSync } from "node:sqlite";
import { existsSync, realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createDatabase } from "../server/postgres.mjs";
import { migrateVenue } from "../server/database-migrations.mjs";
import { loadVenues, venueRegistry } from "../server/venues.mjs";

// Keep the old ledger order and credentials. Only the data importer opens SQLite.
const tableColumns = {
  memberships: ["id", "code", "checkout", "created_at"],
  guest_sessions: ["token_hash", "card_id", "expires_at"],
  staff_sessions: ["token_hash", "role", "expires_at"],
  ledger: ["sequence", "id", "action_id", "card_id", "kind", "receipt", "reverses", "reason", "actor", "actor_role", "created_at"],
  receipt_claims: ["receipt", "event_id"],
  review_clicks: ["day", "clicks"],
  wallet_revision: ["singleton", "revision"],
  wallet_passes: ["pass_type", "serial", "card_id", "auth_token", "revision", "updated_at", "issued_revision", "recovery_version"],
  wallet_devices: ["pass_type", "device_hash", "push_token", "registration"],
  wallet_registrations: ["pass_type", "device_hash", "serial"],
  wallet_notifications: ["pass_type", "device_hash", "revision", "due_at", "attempts", "lease_id", "leased_until"],
  wallet_recovery: ["card_id", "reference", "expires_at", "version"],
};
const defaults = { issued_revision: "revision", recovery_version: "NULL", registration: "1" };
const importMarker = "legacy-sqlite-import";

function legacyRows(source, table, columns) {
  const found = source.prepare(`PRAGMA table_info(${table})`).all();
  if (!found.length) {
    if (table.startsWith("wallet_")) return [];
    throw new Error(`The source is missing its ${table} table.`);
  }
  const sourceColumns = new Set(found.map(({ name }) => name));
  const selectors = columns.map((column) => {
    if (table === "ledger" && column === "sequence") return "rowid AS sequence";
    if (table === "wallet_notifications" && column === "lease_id") return "NULL AS lease_id";
    if (table === "wallet_notifications" && column === "leased_until") return "0 AS leased_until";
    if (sourceColumns.has(column)) return column;
    if (Object.hasOwn(defaults, column)) return `${defaults[column]} AS ${column}`;
    throw new Error(`The source is missing ${table}.${column}.`);
  });
  const statement = source.prepare(`SELECT ${selectors.join(", ")} FROM "${table}"${table === "ledger" ? " ORDER BY rowid" : ""}`);
  statement.setReadBigInts(true);
  return statement.iterate();
}

async function insertRows(client, table, columns, rows) {
  const parameters = rows.flatMap((row) => columns.map((column) => row[column]));
  const tuples = rows.map((_, index) =>
    `(${columns.map((_, column) => `$${index * columns.length + column + 1}`).join(", ")})`
  );
  const conflict = table === "wallet_revision" ? " ON CONFLICT (singleton) DO UPDATE SET revision = EXCLUDED.revision" : "";
  await client.query(`INSERT INTO ${table} (${columns.join(", ")}) VALUES ${tuples.join(", ")}${conflict}`, parameters);
}

export async function importVenueSqlite(database, id, filename) {
  const source = new DatabaseSync(realpathSync(filename), { readOnly: true });
  try {
    source.exec("BEGIN");
    const owner = source.prepare("SELECT name FROM sqlite_schema WHERE name = 'papupay_venue' AND type = 'table'").get();
    if (!owner || source.prepare("SELECT venue_id FROM papupay_venue WHERE singleton = 1").get()?.venue_id !== id) {
      throw new Error("The SQLite file is not a ledger for the requested venue.");
    }

    await migrateVenue(database, id);
    return await database.venue(id).transaction(async (client) => {
      const tables = Object.keys(tableColumns);
      await client.query(`LOCK TABLE schema_migrations, ${tables.join(", ")} IN SHARE ROW EXCLUSIVE MODE`);
      const prior = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [importMarker]);
      if (prior.rowCount) throw new Error("This venue already has a SQLite import.");
      const occupied = await client.query(`SELECT (${tables.filter((name) => name !== "wallet_revision")
        .map((name) => `EXISTS (SELECT 1 FROM ${name})`).join(" OR ")}
        OR EXISTS (SELECT 1 FROM wallet_revision WHERE revision <> 0)) AS has_data`);
      if (occupied.rows[0].has_data) throw new Error("Import requires an empty destination for this venue.");

      const counts = {};
      let nextSequence = 1n;
      for (const [table, columns] of Object.entries(tableColumns)) {
        let batch = [];
        counts[table] = 0;
        // Ledger rows are copied before Wallet passes are present, so the normal
        // ledger trigger never enqueues historical Wallet notifications.
        for (const row of legacyRows(source, table, columns)) {
          if (table === "ledger") nextSequence = row.sequence + 1n;
          batch.push(row);
          counts[table]++;
          if (batch.length === 250) {
            await insertRows(client, table, columns, batch);
            batch = [];
          }
        }
        if (batch.length) await insertRows(client, table, columns, batch);
      }
      await client.query(`ALTER TABLE ledger ALTER COLUMN sequence RESTART WITH ${nextSequence}`);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [importMarker]);
      return counts;
    });
  } finally {
    source.close();
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const args = process.argv.slice(2);
  const demo = args[0] === "--demo";
  const [id, file, ...extra] = args.slice(Number(demo));
  if (!id || !file || extra.length) throw new Error("Usage: npm run db:import-sqlite -- [--demo] <venue-id> <sqlite-file>");
  const env = process.env;
  if (!venueRegistry(loadVenues(env.PAPUPAY_VENUES_FILE, env.PAPUPAY_VENUES_JSON)).has(id)) throw new Error("Unknown venue.");
  if (demo && (!env.PAPUPAY_DEMO_DATABASE_URL || env.PAPUPAY_DEMO_DATABASE_URL === env.DATABASE_URL)) {
    throw new Error("Set PAPUPAY_DEMO_DATABASE_URL to a separate local PostgreSQL database.");
  }
  const url = demo ? env.PAPUPAY_DEMO_DATABASE_URL : env.PAPUPAY_MIGRATION_DATABASE_URL ?? env.DATABASE_URL;
  const database = createDatabase(url, { namespace: demo ? "papupay_demo" : "papupay" });
  try {
    const counts = await importVenueSqlite(database, id, file);
    for (const [table, count] of Object.entries(counts)) console.log(`${table}: ${count}`);
  } finally {
    await database.close();
  }
}
