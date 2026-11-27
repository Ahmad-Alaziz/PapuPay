CREATE TABLE wallet_revision (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  revision BIGINT NOT NULL
);
INSERT INTO wallet_revision VALUES (1, 0);

CREATE TABLE wallet_passes (
  pass_type TEXT NOT NULL,
  serial TEXT NOT NULL,
  card_id TEXT NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  auth_token TEXT NOT NULL,
  revision BIGINT NOT NULL,
  updated_at TEXT NOT NULL,
  issued_revision BIGINT NOT NULL,
  recovery_version BIGINT,
  PRIMARY KEY (pass_type, serial),
  UNIQUE (pass_type, card_id)
);
CREATE INDEX wallet_pass_membership ON wallet_passes(card_id);

CREATE TABLE wallet_devices (
  pass_type TEXT NOT NULL,
  device_hash TEXT NOT NULL,
  push_token TEXT NOT NULL,
  registration BIGINT NOT NULL DEFAULT 1,
  PRIMARY KEY (pass_type, device_hash)
);

CREATE TABLE wallet_registrations (
  pass_type TEXT NOT NULL,
  device_hash TEXT NOT NULL,
  serial TEXT NOT NULL,
  PRIMARY KEY (pass_type, device_hash, serial),
  FOREIGN KEY (pass_type, device_hash) REFERENCES wallet_devices(pass_type, device_hash) ON DELETE CASCADE,
  FOREIGN KEY (pass_type, serial) REFERENCES wallet_passes(pass_type, serial) ON DELETE CASCADE
);
CREATE INDEX wallet_registered_pass ON wallet_registrations(pass_type, serial);

CREATE TABLE wallet_notifications (
  pass_type TEXT NOT NULL,
  device_hash TEXT NOT NULL,
  revision BIGINT NOT NULL,
  due_at BIGINT NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_id TEXT,
  leased_until BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (pass_type, device_hash),
  FOREIGN KEY (pass_type, device_hash) REFERENCES wallet_devices(pass_type, device_hash) ON DELETE CASCADE
);
CREATE INDEX wallet_notifications_due ON wallet_notifications(pass_type, due_at);

CREATE TABLE wallet_recovery (
  card_id TEXT PRIMARY KEY REFERENCES memberships(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL,
  version BIGINT NOT NULL DEFAULT 1
);

CREATE FUNCTION wallet_card_changed() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  next_revision BIGINT;
  changed_at TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM wallet_passes WHERE card_id = NEW.card_id) THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'ledger' THEN
    changed_at := NEW.created_at;
  ELSE
    changed_at := to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  END IF;

  UPDATE wallet_revision SET revision = revision + 1 WHERE singleton = 1
    RETURNING revision INTO next_revision;
  UPDATE wallet_passes SET revision = next_revision, updated_at = changed_at WHERE card_id = NEW.card_id;
  INSERT INTO wallet_notifications (pass_type, device_hash, revision)
    SELECT r.pass_type, r.device_hash, next_revision FROM wallet_registrations r
    JOIN wallet_passes p ON p.pass_type = r.pass_type AND p.serial = r.serial
    WHERE p.card_id = NEW.card_id
    ON CONFLICT (pass_type, device_hash) DO UPDATE SET revision = excluded.revision, due_at = 0, attempts = 0;
  RETURN NEW;
END;
$$;

CREATE TRIGGER wallet_ledger_change AFTER INSERT ON ledger
  FOR EACH ROW EXECUTE FUNCTION wallet_card_changed();
CREATE TRIGGER wallet_restore_change AFTER UPDATE OF version ON wallet_recovery
  FOR EACH ROW WHEN (OLD.version IS DISTINCT FROM NEW.version) EXECUTE FUNCTION wallet_card_changed();
