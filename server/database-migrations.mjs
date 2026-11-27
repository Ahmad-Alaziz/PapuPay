import { readdir, readFile } from "node:fs/promises";

const migrations = new URL("./migrations/", import.meta.url);

export async function migrateVenue(database, id) {
  const schema = database.schema(id);
  const files = (await readdir(migrations)).filter((name) => /^\d{3}-[a-z-]+\.sql$/.test(name)).sort();
  if (files.length === 0) throw new Error("No database migrations found.");

  return database.transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [schema]);
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await client.query("SELECT set_config('search_path', $1, true)", [`${schema}, pg_catalog`]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const installed = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map(({ name }) => name));
    const applied = [];
    for (const file of files) {
      if (installed.has(file)) continue;
      await client.query(await readFile(new URL(file, migrations), "utf8"));
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      applied.push(file);
    }
    return applied;
  });
}
