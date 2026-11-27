import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { createDatabase } from "./postgres.mjs";
import { migrateVenue } from "./database-migrations.mjs";

const url = process.env.PAPUPAY_TEST_DATABASE_URL;

export function pgTest(name, callback) {
  return test(name, { skip: !url && "Set PAPUPAY_TEST_DATABASE_URL to run PostgreSQL integration tests" }, callback);
}

export async function testDatabase(t, ids = ["sweeto"]) {
  const namespace = `papupay_test_${randomBytes(8).toString("hex")}`;
  const database = createDatabase(url, { namespace, max: 8 });
  t.after(async () => {
    try {
      await database.transaction(async (client) => {
        for (const id of ids) await client.query(`DROP SCHEMA IF EXISTS "${database.schema(id)}" CASCADE`);
      });
    } finally {
      await database.close();
    }
  });
  for (const id of ids) await migrateVenue(database, id);
  return database;
}
