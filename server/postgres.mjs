import { createHash } from "node:crypto";
import pg from "pg";

const { Pool } = pg;

export function createDatabase(connectionString, { namespace = "papupay", max = 4 } = {}) {
  if (!connectionString || !["postgres:", "postgresql:"].includes(new URL(connectionString).protocol)) {
    throw new Error("Set DATABASE_URL to a PostgreSQL connection URL.");
  }
  if (!/^[a-z][a-z0-9_]{0,40}$/.test(namespace)) throw new Error("Invalid database namespace.");
  const pool = new Pool({ connectionString, max, connectionTimeoutMillis: 5000 });
  pool.on("error", (error) => console.error("PapuPay idle database connection closed", error.code ?? error.name));

  function schema(id) {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(id)) throw new Error("Invalid venue ID.");
    const suffix = createHash("sha256").update(id).digest("hex").slice(0, 20);
    return `${namespace}_${suffix}`;
  }

  async function transaction(work, { isolation, readOnly = false } = {}) {
    if (isolation && isolation !== "repeatable read") throw new Error("Unsupported transaction isolation.");
    const client = await pool.connect();
    let discard = false;
    try {
      await client.query(`BEGIN${isolation ? " ISOLATION LEVEL REPEATABLE READ" : ""}${readOnly ? " READ ONLY" : ""}`);
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        discard = true;
      }
      throw error;
    } finally {
      client.release(discard);
    }
  }

  function venue(id) {
    const name = schema(id);
    async function scoped(work, options) {
      return transaction(async (client) => {
        // A transaction-local search path also works with transaction-mode poolers.
        await client.query("SELECT set_config('search_path', $1, true)", [`${name}, pg_catalog`]);
        return work(client);
      }, options);
    }
    return {
      transaction: scoped,
      query: (sql, params) => scoped((client) => client.query(sql, params)),
    };
  }

  return { schema, transaction, venue, close: () => pool.end() };
}
