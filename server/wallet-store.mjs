import { createHash, randomBytes, randomUUID } from "node:crypto";

const hashDevice = (device) => createHash("sha256").update(device).digest("hex");
const first = async (client, sql, values) => (await client.query(sql, values)).rows[0];
const pass = (client, type, serial) => first(client, "SELECT * FROM wallet_passes WHERE pass_type = $1 AND serial = $2", [type, serial]);
const advance = async (client) => (await first(client, "UPDATE wallet_revision SET revision = revision + 1 WHERE singleton = 1 RETURNING revision")).revision;

// Ledger writes and Wallet mutations acquire the membership lock before changing pass state.
// A pass can only be issued or registered on one side of a concurrent stamp or recovery update.
const memberForCheckout = (client, checkout) => first(client, "SELECT id FROM memberships WHERE checkout = $1 FOR NO KEY UPDATE", [checkout]);
const lockPassMember = (client, type, serial) => first(client, `
  SELECT m.id FROM wallet_passes p JOIN memberships m ON m.id = p.card_id
  WHERE p.pass_type = $1 AND p.serial = $2 FOR NO KEY UPDATE OF m
`, [type, serial]);

function recoveryEntry(row) {
  // Existing signed links hash numeric millisecond expiry and version values.
  return row ? { ...row, expires_at: Number(row.expires_at), version: Number(row.version) } : null;
}

async function currentRecovery(client, id, now, expiresAt) {
  const prior = await first(client, "SELECT * FROM wallet_recovery WHERE card_id = $1", [id]);
  if (prior && Number(prior.expires_at) > now) return recoveryEntry(prior);
  if (prior) {
    return recoveryEntry(await first(client, `
      UPDATE wallet_recovery SET expires_at = $1, version = version + 1 WHERE card_id = $2 RETURNING *
    `, [expiresAt, id]));
  }
  return recoveryEntry(await first(client, `
    INSERT INTO wallet_recovery (card_id, reference, expires_at) VALUES ($1, $2, $3) RETURNING *
  `, [id, randomBytes(24).toString("base64url"), expiresAt]));
}

export function createWalletStore(db, cardForMember) {
  return {
    pass: (type, serial) => pass(db, type, serial),
    card: (entry) => cardForMember(db, entry.card_id),
    snapshot(type, serial) {
      return db.transaction(async (client) => {
        const entry = await pass(client, type, serial);
        return entry ? { entry, card: await cardForMember(client, entry.card_id) } : null;
      }, { isolation: "repeatable read", readOnly: true });
    },
    issue(type, serial, checkout, { recoveryWindow } = {}) {
      return db.transaction(async (client) => {
        const { id } = await memberForCheckout(client, checkout);
        const entry = await pass(client, type, serial);
        if (entry) return entry;
        const recovery = recoveryWindow && await currentRecovery(client, id, recoveryWindow.now, recoveryWindow.expiresAt);
        const revision = await advance(client);
        return first(client, `
          INSERT INTO wallet_passes (pass_type, serial, card_id, auth_token, revision, updated_at, issued_revision, recovery_version)
          VALUES ($1, $2, $3, $4, $5, $6, $5, $7) RETURNING *
        `, [type, serial, id, randomBytes(32).toString("base64url"), revision, new Date().toISOString(), recovery?.version ?? null]);
      });
    },
    register(type, serial, device, token) {
      return db.transaction(async (client) => {
        await lockPassMember(client, type, serial);
        const current = await pass(client, type, serial);
        const revision = BigInt(current.revision) > BigInt(current.issued_revision) ? await advance(client) : null;
        const key = hashDevice(device);
        await client.query(`
          INSERT INTO wallet_devices (pass_type, device_hash, push_token) VALUES ($1, $2, $3)
          ON CONFLICT (pass_type, device_hash) DO UPDATE SET
            push_token = excluded.push_token, registration = wallet_devices.registration + 1
        `, [type, key, token]);
        const { rowCount } = await client.query(`
          INSERT INTO wallet_registrations (pass_type, device_hash, serial) VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
        `, [type, key, serial]);
        if (rowCount === 1 && revision !== null) {
          // A device may already have seen a newer tag from another pass of this type.
          await client.query(`
            UPDATE wallet_passes SET revision = $3 WHERE pass_type = $1 AND serial = $2
          `, [type, serial, revision]);
          await client.query(`
            INSERT INTO wallet_notifications (pass_type, device_hash, revision) VALUES ($1, $2, $3)
            ON CONFLICT (pass_type, device_hash) DO UPDATE SET revision = excluded.revision, due_at = 0, attempts = 0
          `, [type, key, revision]);
        }
        return rowCount === 1;
      });
    },
    unregister(type, serial, device) {
      return db.transaction(async (client) => {
        await lockPassMember(client, type, serial);
        const key = [type, hashDevice(device)];
        await client.query("SELECT 1 FROM wallet_devices WHERE pass_type = $1 AND device_hash = $2 FOR UPDATE", key);
        await client.query("DELETE FROM wallet_registrations WHERE pass_type = $1 AND device_hash = $2 AND serial = $3", [...key, serial]);
        await client.query(`
          DELETE FROM wallet_devices WHERE pass_type = $1 AND device_hash = $2
            AND NOT EXISTS (SELECT 1 FROM wallet_registrations r WHERE r.pass_type = $1 AND r.device_hash = $2)
        `, key);
      });
    },
    async updated(type, device, since) {
      const { rows } = await db.query(`
        SELECT p.serial, p.revision FROM wallet_passes p
        JOIN wallet_registrations r ON r.pass_type = p.pass_type AND r.serial = p.serial
        WHERE r.pass_type = $1 AND r.device_hash = $2 AND p.revision > $3 ORDER BY p.revision, p.serial
      `, [type, hashDevice(device), since]);
      return rows;
    },
    async claim(type, now, duration) {
      const lease = randomUUID();
      return await first(db, `
        WITH next_job AS (
          SELECT n.pass_type, n.device_hash, d.push_token, d.registration
          FROM wallet_notifications n
          JOIN wallet_devices d ON d.pass_type = n.pass_type AND d.device_hash = n.device_hash
          WHERE n.pass_type = $1 AND n.due_at <= $2 AND n.leased_until <= $2
          ORDER BY n.due_at, n.revision, n.device_hash LIMIT 1 FOR UPDATE OF n SKIP LOCKED
        )
        UPDATE wallet_notifications n SET lease_id = $3, leased_until = $4
        FROM next_job j WHERE n.pass_type = j.pass_type AND n.device_hash = j.device_hash
        RETURNING n.*, j.push_token, j.registration
      `, [type, now, lease, now + duration]) ?? null;
    },
    settle(job, result, dueAt) {
      return db.transaction(async (client) => {
        const key = [job.pass_type, job.device_hash, job.lease_id];
        const device = await first(client, `
          SELECT push_token, registration FROM wallet_devices
          WHERE pass_type = $1 AND device_hash = $2 FOR UPDATE
        `, key.slice(0, 2));
        if (device?.push_token === job.push_token) {
          const ownsCurrent = "pass_type = $1 AND device_hash = $2 AND lease_id = $3 AND revision = $4";
          if (result === "sent") {
            await client.query(`DELETE FROM wallet_notifications WHERE ${ownsCurrent}`, [...key, job.revision]);
          } else if (result === "retry") {
            await client.query(`
              UPDATE wallet_notifications SET due_at = $5, attempts = attempts + 1, lease_id = NULL, leased_until = 0
              WHERE ${ownsCurrent}
            `, [...key, job.revision, dueAt]);
          } else if (result === "unregistered" && device.registration === job.registration) {
            await client.query(`
              DELETE FROM wallet_devices WHERE pass_type = $1 AND device_hash = $2
                AND EXISTS (SELECT 1 FROM wallet_notifications n WHERE n.pass_type = $1 AND n.device_hash = $2 AND n.lease_id = $3)
            `, key);
          }
        }
        await client.query(`
          UPDATE wallet_notifications SET lease_id = NULL, leased_until = 0
          WHERE pass_type = $1 AND device_hash = $2 AND lease_id = $3
        `, key);
      });
    },
    async restore(reference) {
      return recoveryEntry(await first(db, "SELECT * FROM wallet_recovery WHERE reference = $1", [reference]));
    },
    async restoreBound(cardId, version) {
      return recoveryEntry(await first(db, "SELECT * FROM wallet_recovery WHERE card_id = $1 AND version = $2", [cardId, version]));
    },
    restoreLink(checkout, now, expiresAt) {
      return db.transaction(async (client) => {
        const { id } = await memberForCheckout(client, checkout);
        return currentRecovery(client, id, now, expiresAt);
      });
    },
    recover(reference, version, sessionHash, expiresAt, now = Date.now()) {
      return db.transaction(async (client) => {
        const entry = await first(client, `
          SELECT card_id FROM wallet_recovery WHERE reference = $1 AND version = $2 AND expires_at > $3 FOR SHARE
        `, [reference, version, now]);
        if (!entry) return null;
        await client.query("INSERT INTO guest_sessions (token_hash, card_id, expires_at) VALUES ($1, $2, $3)", [
          sessionHash, entry.card_id, expiresAt,
        ]);
        return cardForMember(client, entry.card_id);
      });
    },
    revoke(checkout) {
      return db.transaction(async (client) => {
        const { id } = await memberForCheckout(client, checkout);
        await client.query("UPDATE wallet_recovery SET version = version + 1 WHERE card_id = $1", [id]);
      });
    },
  };
}
