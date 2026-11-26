import { createHash, randomBytes, randomUUID } from "node:crypto";

const hashDevice = (device) => createHash("sha256").update(device).digest("hex");
const cardChange = (timestamp) => `
  UPDATE wallet_revision SET revision = revision + 1 WHERE singleton = 1;
  UPDATE wallet_passes
    SET revision = (SELECT revision FROM wallet_revision WHERE singleton = 1), updated_at = ${timestamp}
    WHERE card_id = NEW.card_id;
  INSERT INTO wallet_notifications(pass_type, device_hash, revision)
    SELECT r.pass_type, r.device_hash, p.revision FROM wallet_registrations r
    JOIN wallet_passes p ON p.pass_type = r.pass_type AND p.serial = r.serial
    WHERE p.card_id = NEW.card_id
    ON CONFLICT(pass_type, device_hash) DO UPDATE SET revision = excluded.revision, due_at = 0, attempts = 0;
`;

export function createWalletStore(db, transaction, cardForMember) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallet_revision (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1), revision INTEGER NOT NULL
    ) STRICT;
    INSERT OR IGNORE INTO wallet_revision VALUES (1, 0);
    CREATE TABLE IF NOT EXISTS wallet_passes (
      pass_type TEXT NOT NULL,
      serial TEXT NOT NULL,
      card_id TEXT NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
      auth_token TEXT NOT NULL,
      revision INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      issued_revision INTEGER NOT NULL,
      recovery_version INTEGER,
      PRIMARY KEY (pass_type, serial),
      UNIQUE (pass_type, card_id)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS wallet_pass_membership ON wallet_passes(card_id);
    CREATE TABLE IF NOT EXISTS wallet_devices (
      pass_type TEXT NOT NULL,
      device_hash TEXT NOT NULL,
      push_token TEXT NOT NULL,
      registration INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (pass_type, device_hash)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS wallet_registrations (
      pass_type TEXT NOT NULL,
      device_hash TEXT NOT NULL,
      serial TEXT NOT NULL,
      PRIMARY KEY (pass_type, device_hash, serial),
      FOREIGN KEY (pass_type, device_hash) REFERENCES wallet_devices(pass_type, device_hash) ON DELETE CASCADE,
      FOREIGN KEY (pass_type, serial) REFERENCES wallet_passes(pass_type, serial) ON DELETE CASCADE
    ) STRICT;
    CREATE INDEX IF NOT EXISTS wallet_registered_pass ON wallet_registrations(pass_type, serial);
    CREATE TABLE IF NOT EXISTS wallet_notifications (
      pass_type TEXT NOT NULL,
      device_hash TEXT NOT NULL,
      revision INTEGER NOT NULL,
      due_at INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      lease_id TEXT,
      leased_until INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (pass_type, device_hash),
      FOREIGN KEY (pass_type, device_hash) REFERENCES wallet_devices(pass_type, device_hash) ON DELETE CASCADE
    ) STRICT;
    CREATE INDEX IF NOT EXISTS wallet_notifications_due ON wallet_notifications(pass_type, due_at);
    CREATE TABLE IF NOT EXISTS wallet_recovery (
      card_id TEXT PRIMARY KEY REFERENCES memberships(id) ON DELETE CASCADE,
      reference TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    ) STRICT;

    CREATE TRIGGER IF NOT EXISTS wallet_ledger_change AFTER INSERT ON ledger
    WHEN EXISTS (SELECT 1 FROM wallet_passes WHERE card_id = NEW.card_id)
    BEGIN ${cardChange("NEW.created_at")} END;
    CREATE TRIGGER IF NOT EXISTS wallet_restore_change AFTER UPDATE OF version ON wallet_recovery
    WHEN EXISTS (SELECT 1 FROM wallet_passes WHERE card_id = NEW.card_id)
    BEGIN ${cardChange("strftime('%Y-%m-%dT%H:%M:%fZ', 'now')")} END;
  `);
  transaction(() => {
    const columns = db.prepare("PRAGMA table_info(wallet_passes)").all().map(({ name }) => name);
    if (!columns.includes("issued_revision")) {
      db.exec(`ALTER TABLE wallet_passes ADD COLUMN issued_revision INTEGER NOT NULL DEFAULT 0;
        UPDATE wallet_passes SET issued_revision = revision;`);
    }
    if (!columns.includes("recovery_version")) {
      db.exec("ALTER TABLE wallet_passes ADD COLUMN recovery_version INTEGER");
    }
  });

  const query = {
    memberForCheckout: db.prepare("SELECT id FROM memberships WHERE checkout = ?"),
    advance: db.prepare("UPDATE wallet_revision SET revision = revision + 1 WHERE singleton = 1 RETURNING revision"),
    pass: db.prepare("SELECT * FROM wallet_passes WHERE pass_type = ? AND serial = ?"),
    insertPass: db.prepare(`INSERT INTO wallet_passes(pass_type, serial, card_id, auth_token, revision, updated_at, issued_revision, recovery_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
    registerDevice: db.prepare(`INSERT INTO wallet_devices(pass_type, device_hash, push_token) VALUES (?, ?, ?)
      ON CONFLICT(pass_type, device_hash) DO UPDATE SET push_token = excluded.push_token, registration = registration + 1`),
    registerPass: db.prepare("INSERT OR IGNORE INTO wallet_registrations VALUES (?, ?, ?)"),
    enqueue: db.prepare(`INSERT INTO wallet_notifications(pass_type, device_hash, revision) VALUES (?, ?, ?)
      ON CONFLICT(pass_type, device_hash) DO UPDATE SET revision = excluded.revision, due_at = 0, attempts = 0`),
    unregisterPass: db.prepare("DELETE FROM wallet_registrations WHERE pass_type = ? AND device_hash = ? AND serial = ?"),
    removeUnusedDevice: db.prepare(`DELETE FROM wallet_devices WHERE pass_type = ? AND device_hash = ?
      AND NOT EXISTS (SELECT 1 FROM wallet_registrations r WHERE r.pass_type = wallet_devices.pass_type AND r.device_hash = wallet_devices.device_hash)`),
    updatedPasses: db.prepare(`SELECT p.serial, p.revision FROM wallet_passes p
      JOIN wallet_registrations r ON r.pass_type = p.pass_type AND r.serial = p.serial
      WHERE r.pass_type = ? AND r.device_hash = ? AND p.revision > ? ORDER BY p.revision, p.serial`),
    due: db.prepare(`SELECT n.*, d.push_token, d.registration FROM wallet_notifications n
      JOIN wallet_devices d ON d.pass_type = n.pass_type AND d.device_hash = n.device_hash
      WHERE n.pass_type = ? AND n.due_at <= ? AND n.leased_until <= ?
      ORDER BY n.due_at, n.revision LIMIT 1`),
    lease: db.prepare(`UPDATE wallet_notifications SET lease_id = ?, leased_until = ?
      WHERE pass_type = ? AND device_hash = ?`),
    ack: db.prepare(`DELETE FROM wallet_notifications WHERE pass_type = ? AND device_hash = ?
      AND lease_id = ? AND revision = ? AND EXISTS (SELECT 1 FROM wallet_devices d
        WHERE d.pass_type = wallet_notifications.pass_type AND d.device_hash = wallet_notifications.device_hash AND d.push_token = ?)`),
    retry: db.prepare(`UPDATE wallet_notifications SET due_at = ?, attempts = attempts + 1, lease_id = NULL, leased_until = 0
      WHERE pass_type = ? AND device_hash = ? AND lease_id = ? AND revision = ? AND EXISTS (SELECT 1 FROM wallet_devices d
        WHERE d.pass_type = wallet_notifications.pass_type AND d.device_hash = wallet_notifications.device_hash AND d.push_token = ?)`),
    release: db.prepare(`UPDATE wallet_notifications SET lease_id = NULL, leased_until = 0
      WHERE pass_type = ? AND device_hash = ? AND lease_id = ?`),
    forgetToken: db.prepare(`DELETE FROM wallet_devices WHERE pass_type = ? AND device_hash = ? AND push_token = ? AND registration = ?
      AND EXISTS (SELECT 1 FROM wallet_notifications n WHERE n.pass_type = wallet_devices.pass_type
        AND n.device_hash = wallet_devices.device_hash AND n.lease_id = ?)`),
    restore: db.prepare("SELECT * FROM wallet_recovery WHERE reference = ?"),
    restoreForMember: db.prepare("SELECT * FROM wallet_recovery WHERE card_id = ?"),
    createRestore: db.prepare("INSERT INTO wallet_recovery(card_id, reference, expires_at) VALUES (?, ?, ?)"),
    renewRestore: db.prepare("UPDATE wallet_recovery SET expires_at = ?, version = version + 1 WHERE card_id = ?"),
    revokeRestore: db.prepare("UPDATE wallet_recovery SET version = version + 1 WHERE card_id = ?"),
    recoverSession: db.prepare(`INSERT INTO guest_sessions (token_hash, card_id, expires_at)
      SELECT ?, card_id, ? FROM wallet_recovery WHERE reference = ? AND version = ? AND expires_at > ? RETURNING card_id`),
  };

  return {
    pass: (type, serial) => query.pass.get(type, serial),
    card: (entry) => cardForMember(entry.card_id),
    snapshot(type, serial) {
      return transaction(() => {
        const entry = query.pass.get(type, serial);
        return entry ? { entry, card: cardForMember(entry.card_id) } : null;
      }, true);
    },
    issue(type, serial, checkout, recoveryVersion = null) {
      return transaction(() => {
        const entry = query.pass.get(type, serial);
        if (entry) return entry;
        const { id } = query.memberForCheckout.get(checkout);
        const { revision } = query.advance.get();
        query.insertPass.run(type, serial, id, randomBytes(32).toString("base64url"), revision, new Date().toISOString(), revision, recoveryVersion);
        return query.pass.get(type, serial);
      });
    },
    register(type, serial, device, token) {
      return transaction(() => {
        const key = hashDevice(device);
        query.registerDevice.run(type, key, token);
        const created = query.registerPass.run(type, key, serial).changes === 1;
        const pass = query.pass.get(type, serial);
        if (created && pass.revision > pass.issued_revision) {
          const { revision } = query.advance.get();
          query.enqueue.run(type, key, revision);
        }
        return created;
      });
    },
    unregister(type, serial, device) {
      return transaction(() => {
        const key = hashDevice(device);
        query.unregisterPass.run(type, key, serial);
        query.removeUnusedDevice.run(type, key);
      });
    },
    updated: (type, device, since) => query.updatedPasses.all(type, hashDevice(device), since),
    claim(type, now, duration) {
      return transaction(() => {
        const job = query.due.get(type, now, now);
        if (!job) return null;
        const lease = randomUUID();
        query.lease.run(lease, now + duration, type, job.device_hash);
        return { ...job, lease_id: lease };
      });
    },
    settle(job, result, dueAt) {
      return transaction(() => {
        const key = [job.pass_type, job.device_hash, job.lease_id];
        if (result === "sent") query.ack.run(...key, job.revision, job.push_token);
        if (result === "retry") query.retry.run(dueAt, ...key, job.revision, job.push_token);
        if (result === "unregistered") query.forgetToken.run(job.pass_type, job.device_hash, job.push_token, job.registration, job.lease_id);
        query.release.run(...key);
      });
    },
    restore: (reference) => query.restore.get(reference),
    restoreBound(cardId, version) {
      const entry = query.restoreForMember.get(cardId);
      return entry?.version === version ? entry : null;
    },
    restoreLink(checkout, now, expiresAt) {
      return transaction(() => {
        const { id } = query.memberForCheckout.get(checkout);
        const prior = query.restoreForMember.get(id);
        if (prior && prior.expires_at > now) return prior;
        if (prior) query.renewRestore.run(expiresAt, id);
        else query.createRestore.run(id, randomBytes(24).toString("base64url"), expiresAt);
        return query.restoreForMember.get(id);
      });
    },
    recover(reference, version, sessionHash, expiresAt) {
      const result = query.recoverSession.get(sessionHash, expiresAt, reference, version, Date.now());
      return result ? cardForMember(result.card_id) : null;
    },
    revoke(checkout) {
      const { id } = query.memberForCheckout.get(checkout);
      query.revokeRestore.run(id);
    },
  };
}
