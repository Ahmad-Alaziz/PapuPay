import { createHash, randomBytes, randomUUID } from "node:crypto";
import { dirname } from "node:path";
import { chmodSync, mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createWalletStore } from "./wallet-store.mjs";

const goal = 6;
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const digest = (value) => createHash("sha256").update(value).digest("hex");
export const privateToken = () => randomBytes(32).toString("base64url");

export class ApiError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
  }
}

const cardDetails = `SELECT m.*,
  (SELECT COUNT(*) FROM ledger l WHERE l.card_id = m.id AND l.kind = 'stamp'
    AND NOT EXISTS (SELECT 1 FROM ledger r WHERE r.reverses = l.id)) AS visits,
  (SELECT COUNT(*) FROM ledger l WHERE l.card_id = m.id AND l.kind = 'redeem'
    AND NOT EXISTS (SELECT 1 FROM ledger r WHERE r.reverses = l.id)) AS rewards,
  COALESCE((SELECT l.created_at FROM ledger l WHERE l.card_id = m.id
    ORDER BY l.rowid DESC LIMIT 1), m.created_at) AS updated_at FROM memberships m`;

function publicCard(row) {
  if (!row) return null;
  const balance = row.visits - row.rewards * goal;
  return {
    code: row.code,
    checkout: row.checkout,
    stamps: Math.min(balance, goal),
    goal,
    rewardAvailable: balance >= goal,
    visits: row.visits,
    updatedAt: row.updated_at,
  };
}

export function openLoyalty(path, venueId) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA busy_timeout = 5000; BEGIN IMMEDIATE;");
  try {
    const hasOwner = db.prepare("SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = 'papupay_venue'").get();
    if (hasOwner) {
      const owner = db.prepare("SELECT venue_id FROM papupay_venue WHERE singleton = 1").get();
      if (owner?.venue_id !== venueId) throw new Error(`Use a database dedicated to ${venueId}.`);
    } else {
      const oldLoyalty = db.prepare("SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name IN ('ledger', 'memberships')").get();
      if (oldLoyalty) throw new Error(`PAPUPAY_DB points to the previous ledger. Use a new database for ${venueId}.`);
      db.exec("CREATE TABLE papupay_venue (singleton INTEGER PRIMARY KEY CHECK (singleton = 1), venue_id TEXT NOT NULL) STRICT");
      db.prepare("INSERT INTO papupay_venue VALUES (1, ?)").run(venueId);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    db.close();
    throw error;
  }
  if (path !== ":memory:") {
    try {
      chmodSync(path, 0o600);
      for (const sidecar of [`${path}-wal`, `${path}-shm`]) {
        try { chmodSync(sidecar, 0o600); }
        catch (error) { if (error.code !== "ENOENT") throw error; }
      }
    } catch (error) {
      db.close();
      throw error;
    }
  }
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS memberships (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      checkout TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS guest_sessions (
      token_hash TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES memberships(id),
      expires_at INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS staff_sessions (
      token_hash TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK (role IN ('staff', 'manager')),
      expires_at INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS ledger (
      id TEXT PRIMARY KEY,
      action_id TEXT NOT NULL UNIQUE,
      card_id TEXT NOT NULL REFERENCES memberships(id),
      kind TEXT NOT NULL CHECK (kind IN ('stamp', 'redeem', 'reverse')),
      receipt TEXT,
      reverses TEXT UNIQUE REFERENCES ledger(id),
      reason TEXT,
      actor TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      created_at TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS ledger_card ON ledger(card_id);
    CREATE TABLE IF NOT EXISTS receipt_claims (
      receipt TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES ledger(id)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS review_clicks (
      day TEXT PRIMARY KEY,
      clicks INTEGER NOT NULL
    ) STRICT;
  `);

  const statements = {
    cardById: db.prepare(`${cardDetails} WHERE m.id = ?`),
    cardByCode: db.prepare(`${cardDetails} WHERE m.checkout = ? OR m.code = ?`),
    guestCard: db.prepare(`${cardDetails} WHERE m.id = (SELECT card_id FROM guest_sessions
      WHERE token_hash = ? AND expires_at > ?)`),
    insertGuest: db.prepare("INSERT INTO guest_sessions VALUES (?, ?, ?)"),
    insertCard: db.prepare("INSERT OR IGNORE INTO memberships VALUES (?, ?, ?, ?)"),
    staff: db.prepare("SELECT role FROM staff_sessions WHERE token_hash = ? AND expires_at > ?"),
    insertStaff: db.prepare("INSERT INTO staff_sessions VALUES (?, ?, ?)"),
    deleteStaff: db.prepare("DELETE FROM staff_sessions WHERE token_hash = ?"),
    events: db.prepare(`SELECT l.*, EXISTS (SELECT 1 FROM ledger r WHERE r.reverses = l.id) AS reversed
      FROM ledger l WHERE l.card_id = ? ORDER BY l.rowid DESC LIMIT 20`),
    event: db.prepare("SELECT * FROM ledger WHERE id = ? AND card_id = ?"),
    action: db.prepare("SELECT * FROM ledger WHERE action_id = ?"),
    reversal: db.prepare("SELECT 1 FROM ledger WHERE reverses = ?"),
    insertEvent: db.prepare("INSERT INTO ledger VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"),
    receipt: db.prepare("SELECT 1 FROM receipt_claims WHERE receipt = ?"),
    insertReceipt: db.prepare("INSERT INTO receipt_claims VALUES (?, ?)"),
    removeReceipt: db.prepare("DELETE FROM receipt_claims WHERE event_id = ?"),
    reviewClick: db.prepare(`INSERT INTO review_clicks VALUES (?, 1)
      ON CONFLICT(day) DO UPDATE SET clicks = clicks + 1`),
  };

  function transaction(callback, readOnly = false) {
    db.exec(readOnly ? "BEGIN" : "BEGIN IMMEDIATE");
    try {
      const result = callback();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  function details(card) {
    return {
      card: publicCard(card),
      events: statements.events.all(card.id).map((row) => ({
        id: row.id,
        kind: row.kind,
        receipt: row.receipt,
        createdAt: row.created_at,
        reversed: Boolean(row.reversed),
        reason: row.reason,
      })),
    };
  }

  function rowFor(code) {
    const manualCode = code.replace(/[\s-]/g, "").toUpperCase();
    const row = statements.cardByCode.get(code, manualCode);
    if (!row) throw new ApiError(404, "card_not_found");
    return row;
  }

  return {
    close: () => db.close(),
    wallet: createWalletStore(db, transaction, (id) => publicCard(statements.cardById.get(id))),
    guest: (token) => token ? publicCard(statements.guestCard.get(digest(token), Date.now())) : null,
    createGuest(token, expiresAt) {
      return transaction(() => {
        const id = randomUUID();
        const now = new Date().toISOString();
        let inserted = false;
        for (let attempt = 0; attempt < 4 && !inserted; attempt++) {
          const code = Array.from(randomBytes(8), (byte) => alphabet[byte % alphabet.length]).join("");
          const checkout = `pp_${randomBytes(18).toString("base64url")}`;
          inserted = statements.insertCard.run(id, code, checkout, now).changes === 1;
        }
        if (!inserted) throw new Error("Membership identifier collision");
        statements.insertGuest.run(digest(token), id, expiresAt);
        return publicCard(statements.cardById.get(id));
      });
    },
    staff(token) {
      if (!token) return null;
      const id = digest(token);
      const staff = statements.staff.get(id, Date.now());
      return staff ? { id, role: staff.role } : null;
    },
    createStaff: (token, role, expiresAt) => statements.insertStaff.run(digest(token), role, expiresAt),
    deleteStaff: (token) => { if (token) statements.deleteStaff.run(digest(token)); },
    lookup: (code) => details(rowFor(code)),
    updateCard({ code, actionId, kind, receipt = null, eventId = null, reason = null, actor }) {
      return transaction(() => {
        const card = rowFor(code);
        const existing = statements.action.get(actionId);
        if (existing) {
          if (existing.card_id !== card.id || existing.kind !== kind || existing.receipt !== receipt
             || existing.reverses !== eventId || existing.reason !== reason) {
            throw new ApiError(409, "action_conflict");
          }
          return details(card);
        }
        if (receipt && statements.receipt.get(receipt)) throw new ApiError(409, "receipt_already_used");
        const balance = card.visits - card.rewards * goal;
        if (kind === "redeem" && balance < goal) throw new ApiError(409, "reward_unavailable");
        if (kind === "reverse") {
          const target = statements.event.get(eventId, card.id);
          if (!target || target.kind === "reverse") throw new ApiError(404, "event_not_found");
          if (statements.reversal.get(eventId)) throw new ApiError(409, "event_already_reversed");
          if (target.kind === "stamp" && balance === 0) throw new ApiError(409, "correction_not_possible");
          if (target.kind === "stamp") statements.removeReceipt.run(eventId);
        }
        const id = randomUUID();
        statements.insertEvent.run(id, actionId, card.id, kind, receipt, eventId, reason, actor.id, actor.role, new Date().toISOString());
        if (receipt) statements.insertReceipt.run(receipt, id);
        return details(statements.cardById.get(card.id));
      });
    },
    countReviewClick: () => statements.reviewClick.run(new Date().toISOString().slice(0, 10)),
  };
}
