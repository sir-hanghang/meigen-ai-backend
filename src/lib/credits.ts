import type { D1Database } from "@cloudflare/workers-types";

export interface CreditBalance {
  total: number;
  expiring: number;
  permanent: number;
  expiresAt: string | null;
}

export async function getCreditBalance(
  db: D1Database,
  userId: number
): Promise<CreditBalance> {
  const row = await db
    .prepare(
      `SELECT credits_total, credits_expiring, credits_expires_at FROM users WHERE id = ?`
    )
    .bind(userId)
    .first<{ credits_total: number; credits_expiring: number; credits_expires_at: string | null }>();

  if (!row) {
    return { total: 0, expiring: 0, permanent: 0, expiresAt: null };
  }

  const now = new Date().toISOString();
  const expired = row.credits_expires_at && row.credits_expires_at < now;
  const expiring = expired ? 0 : row.credits_expiring;
  const permanent = row.credits_total - row.credits_expiring;

  return {
    total: expiring + Math.max(0, permanent),
    expiring,
    permanent: Math.max(0, permanent),
    expiresAt: expired ? null : row.credits_expires_at,
  };
}

export async function deductCredits(
  db: D1Database,
  userId: number,
  amount: number
): Promise<boolean> {
  const now = new Date().toISOString();

  // First try to deduct from expiring credits
  const result = await db
    .prepare(
      `UPDATE users SET
        credits_total = CASE
          WHEN credits_expires_at > ? THEN credits_total - ?
          ELSE credits_total - credits_expiring - (? - credits_expiring)
        END,
        credits_expiring = CASE
          WHEN credits_expires_at > ? THEN MAX(0, credits_expiring - ?)
          ELSE 0
        END
      WHERE id = ? AND credits_total >= ?`
    )
    .bind(now, amount, amount, now, amount, userId, amount)
    .run();

  return result.success && (result.meta?.changes ?? 0) > 0;
}

export async function addCredits(
  db: D1Database,
  userId: number,
  amount: number,
  type: "signup_bonus" | "purchase_pro" | "purchase_pack" | "refund",
  expiresAt?: string
): Promise<void> {
  if (type === "purchase_pro" && expiresAt) {
    await db
      .prepare(
        `UPDATE users SET
          credits_total = credits_total + ?,
          credits_expiring = credits_expiring + ?,
          credits_expires_at = ?,
          updated_at = datetime('now')
        WHERE id = ?`
      )
      .bind(amount, amount, expiresAt, userId)
      .run();
  } else {
    await db
      .prepare(
        `UPDATE users SET
          credits_total = credits_total + ?,
          updated_at = datetime('now')
        WHERE id = ?`
      )
      .bind(amount, userId)
      .run();
  }

  await db
    .prepare(
      `INSERT INTO credit_transactions (user_id, amount, type, expires_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(userId, amount, type, expiresAt || null)
    .run();
}

export async function getAnonymousUsage(
  db: D1Database,
  clientIdHash: string,
  date: string
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT count FROM anonymous_usage_limits WHERE client_id_hash = ? AND date = ?`
    )
    .bind(clientIdHash, date)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function incrementAnonymousUsage(
  db: D1Database,
  clientIdHash: string,
  date: string
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO anonymous_usage_limits (client_id_hash, date, count)
       VALUES (?, ?, 1)
       ON CONFLICT(client_id_hash) DO UPDATE SET
         count = count + 1,
         updated_at = datetime('now')`
    )
    .bind(clientIdHash, date)
    .run();
}
