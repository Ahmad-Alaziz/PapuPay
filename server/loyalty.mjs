import { createHash, randomBytes, randomUUID } from "node:crypto";
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
    ORDER BY l.sequence DESC LIMIT 1), m.created_at) AS updated_at FROM memberships m`;

async function one(client, query, values) {
  const { rows } = await client.query(query, values);
  return rows[0] ?? null;
}

function readCard(client, id) {
  return one(client, `${cardDetails} WHERE m.id = $1`, [id]);
}

function publicCard(row) {
  if (!row) return null;
  const visits = Number(row.visits);
  const balance = visits - Number(row.rewards) * goal;
  return {
    code: row.code,
    checkout: row.checkout,
    stamps: Math.min(balance, goal),
    goal,
    rewardAvailable: balance >= goal,
    visits,
    updatedAt: row.updated_at,
  };
}

async function details(client, card) {
  const { rows } = await client.query(`SELECT l.*, EXISTS (SELECT 1 FROM ledger r WHERE r.reverses = l.id) AS reversed
    FROM ledger l WHERE l.card_id = $1 ORDER BY l.sequence DESC LIMIT 20`, [card.id]);
  return {
    card: publicCard(card),
    events: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      receipt: row.receipt,
      createdAt: row.created_at,
      reversed: row.reversed,
      reason: row.reason,
    })),
  };
}

const matchingCard = "checkout = $1 OR code = $2";

function cardCodes(code) {
  return [code, code.replace(/[\s-]/g, "").toUpperCase()];
}

function checkAction(event, card, kind, receipt, eventId, reason) {
  if (event.card_id !== card.id || event.kind !== kind || event.receipt !== receipt
    || event.reverses !== eventId || event.reason !== reason) {
    throw new ApiError(409, "action_conflict");
  }
}

export function openLoyalty(db) {
  return {
    wallet: createWalletStore(db, async (client, id) => publicCard(await readCard(client, id))),
    async guest(token) {
      if (!token) return null;
      const row = await one(db, `${cardDetails} WHERE m.id = (SELECT card_id FROM guest_sessions
        WHERE token_hash = $1 AND expires_at > $2)`, [digest(token), Date.now()]);
      return publicCard(row);
    },
    createGuest(token, expiresAt) {
      return db.transaction(async (client) => {
        const id = randomUUID();
        const now = new Date().toISOString();
        for (let attempt = 0; attempt < 4; attempt++) {
          const code = Array.from(randomBytes(8), (byte) => alphabet[byte % alphabet.length]).join("");
          const checkout = `pp_${randomBytes(18).toString("base64url")}`;
          const { rowCount } = await client.query(`INSERT INTO memberships (id, code, checkout, created_at)
            VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, [id, code, checkout, now]);
          if (rowCount === 1) {
            await client.query("INSERT INTO guest_sessions (token_hash, card_id, expires_at) VALUES ($1, $2, $3)",
              [digest(token), id, expiresAt]);
            return publicCard(await readCard(client, id));
          }
        }
        throw new Error("Membership identifier collision");
      });
    },
    async staff(token) {
      if (!token) return null;
      const id = digest(token);
      const staff = await one(db, "SELECT role FROM staff_sessions WHERE token_hash = $1 AND expires_at > $2",
        [id, Date.now()]);
      return staff ? { id, role: staff.role } : null;
    },
    createStaff(token, role, expiresAt, replaces = null) {
      return db.transaction(async (client) => {
        await client.query("INSERT INTO staff_sessions (token_hash, role, expires_at) VALUES ($1, $2, $3)",
          [digest(token), role, expiresAt]);
        if (replaces) await client.query("DELETE FROM staff_sessions WHERE token_hash = $1", [digest(replaces)]);
      });
    },
    async deleteStaff(token) {
      if (token) await db.query("DELETE FROM staff_sessions WHERE token_hash = $1", [digest(token)]);
    },
    lookup(code) {
      return db.transaction(async (client) => {
        const card = await one(client, `${cardDetails} WHERE ${matchingCard}`, cardCodes(code));
        if (!card) throw new ApiError(404, "card_not_found");
        return details(client, card);
      }, { isolation: "repeatable read", readOnly: true });
    },
    updateCard({ code, actionId, kind, receipt = null, eventId = null, reason = null, actor }) {
      return db.transaction(async (client) => {
        // Read the balance after acquiring the membership lock so we see the prior till's commit.
        const member = await one(client, `SELECT id FROM memberships WHERE ${matchingCard} FOR NO KEY UPDATE`, cardCodes(code));
        if (!member) throw new ApiError(404, "card_not_found");
        const card = await readCard(client, member.id);
        const previousAction = () => one(client, "SELECT * FROM ledger WHERE action_id = $1", [actionId]);
        const existing = await previousAction();
        if (existing) {
          checkAction(existing, card, kind, receipt, eventId, reason);
          return details(client, card);
        }

        if (receipt && await one(client, "SELECT 1 FROM receipt_claims WHERE receipt = $1", [receipt])) {
          throw new ApiError(409, "receipt_already_used");
        }
        const balance = Number(card.visits) - Number(card.rewards) * goal;
        if (kind === "redeem" && balance < goal) throw new ApiError(409, "reward_unavailable");

        let releasesReceipt = false;
        if (kind === "reverse") {
          const target = await one(client, "SELECT kind FROM ledger WHERE id = $1 AND card_id = $2", [eventId, card.id]);
          if (!target || target.kind === "reverse") throw new ApiError(404, "event_not_found");
          if (await one(client, "SELECT 1 FROM ledger WHERE reverses = $1", [eventId])) {
            throw new ApiError(409, "event_already_reversed");
          }
          releasesReceipt = target.kind === "stamp";
          if (releasesReceipt && balance === 0) throw new ApiError(409, "correction_not_possible");
        }

        const id = randomUUID();
        const event = await client.query(`INSERT INTO ledger
          (id, action_id, card_id, kind, receipt, reverses, reason, actor, actor_role, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (action_id) DO NOTHING`,
        [id, actionId, card.id, kind, receipt, eventId, reason, actor.id, actor.role, new Date().toISOString()]);
        if (event.rowCount === 0) {
          // A request for a different membership can race for the same action ID.
          checkAction(await previousAction(), card, kind, receipt, eventId, reason);
          return details(client, card);
        }

        if (releasesReceipt) await client.query("DELETE FROM receipt_claims WHERE event_id = $1", [eventId]);
        if (receipt) {
          const claimed = await client.query(`INSERT INTO receipt_claims (receipt, event_id)
            VALUES ($1, $2) ON CONFLICT (receipt) DO NOTHING`, [receipt, id]);
          if (claimed.rowCount === 0) throw new ApiError(409, "receipt_already_used");
        }
        return details(client, await readCard(client, card.id));
      });
    },
    countReviewClick: () => db.query(`INSERT INTO review_clicks (day, clicks) VALUES ($1, 1)
      ON CONFLICT (day) DO UPDATE SET clicks = review_clicks.clicks + 1`, [new Date().toISOString().slice(0, 10)]),
    rateLimit(scope, key, valid, { limit, windowMs, maxKeys = scope === "recovery" ? 4096 : 10_000, now = Date.now() }) {
      return db.transaction(async (client) => {
        // Serialize the per-venue bucket so the bounded set and the attempt count are shared by all API instances.
        await client.query("SELECT pg_advisory_xact_lock(hashtext(current_schema()::text), hashtext($1))", [scope]);
        await client.query("DELETE FROM auth_attempts WHERE scope = $1 AND expires_at <= $2", [scope, now]);
        const clientHash = digest(key);
        const attempt = await one(client, "SELECT attempts FROM auth_attempts WHERE scope = $1 AND client_hash = $2",
          [scope, clientHash]);
        if (attempt?.attempts >= limit) return false;
        if (!attempt && await one(client, "SELECT 1 FROM auth_attempts WHERE scope = $1 LIMIT 1 OFFSET $2",
          [scope, maxKeys - 1])) return false;

        if (valid) {
          if (attempt) await client.query("DELETE FROM auth_attempts WHERE scope = $1 AND client_hash = $2", [scope, clientHash]);
        } else {
          await client.query(`INSERT INTO auth_attempts (scope, client_hash, attempts, expires_at) VALUES ($1, $2, 1, $3)
            ON CONFLICT (scope, client_hash) DO UPDATE SET attempts = auth_attempts.attempts + 1`,
          [scope, clientHash, now + windowMs]);
        }
        return true;
      });
    },
  };
}
