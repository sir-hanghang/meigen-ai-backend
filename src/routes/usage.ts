import { Hono } from "hono";
import type { Env } from "../types";
import { success, error, jsonResponse } from "../lib/response";
import { getCurrentUser } from "../lib/session";
import { getCreditBalance, getAnonymousUsage } from "../lib/credits";

const app = new Hono<{ Bindings: Env }>();

// GET /api/usage
app.get("/", async (c) => {
  const env = c.env;
  const user = await getCurrentUser(c.req.raw, env);
  const db = env.DB;

  if (user) {
    const balance = await getCreditBalance(db, user.userId);

    // Get recent usage
    const usage = await db
      .prepare(
        `SELECT action, credits_used, created_at FROM usage_records
         WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`
      )
      .bind(user.userId)
      .all<{ action: string; credits_used: number; created_at: string }>();

    return c.json(
      success({
        userId: user.userId,
        plan: user.plan,
        credits: balance,
        recentUsage: usage.results || [],
      })
    );
  } else {
    // Anonymous user
    const clientId = c.req.query("clientId");
    const dailyLimit = parseInt(env.ANONYMOUS_DAILY_FREE_LIMIT || "3");
    const today = new Date().toISOString().split("T")[0];

    const clientIdHash = clientId
      ? await crypto.subtle
          .digest("SHA-256", new TextEncoder().encode(clientId))
          .then((b) =>
            Array.from(new Uint8Array(b))
              .map((x) => x.toString(16).padStart(2, "0"))
              .join("")
          )
      : "anonymous";

    const used = await getAnonymousUsage(db, clientIdHash, today);

    return c.json(
      success({
        anonymous: true,
        max_per_day: dailyLimit,
        used_today: used,
        remaining: Math.max(0, dailyLimit - used),
        remainingToday: Math.max(0, dailyLimit - used),
      })
    );
  }
});

export default app;
