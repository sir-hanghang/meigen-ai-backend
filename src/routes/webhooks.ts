import { Hono } from "hono";
import type { Env } from "../types";
import { success, error, jsonResponse } from "../lib/response";
import { capturePayPalOrder, verifyPayPalWebhook } from "../lib/paypal";
import { addCredits } from "../lib/credits";

const app = new Hono<{ Bindings: Env }>();

// POST /api/webhooks/paypal
app.post("/paypal", async (c) => {
  const env = c.env;
  const rawBody = await c.req.text();

  // Verify webhook signature (MVP: basic check)
  const verified = await verifyPayPalWebhook(env, c.req.raw.headers, rawBody);
  if (!verified) {
    return jsonResponse(error("WEBHOOK_VERIFICATION_FAILED", "Invalid webhook signature"), 400);
  }

  const event = JSON.parse(rawBody) as {
    id: string;
    event_type: string;
    resource: {
      id: string;
      status: string;
      custom_id?: string;
      purchase_units?: Array<{
        custom_id?: string;
        amount: { value: string; currency_code: string };
      }>;
    };
  };

  // Idempotency check
  const existing = await env.DB
    .prepare("SELECT id FROM webhook_events WHERE provider = 'paypal' AND event_id = ?")
    .bind(event.id)
    .first();

  if (existing) {
    return c.json(success({ message: "Already processed" }));
  }

  // Record webhook event
  await env.DB
    .prepare(
      `INSERT INTO webhook_events (provider, event_id, event_type, payload)
       VALUES ('paypal', ?, ?, ?)`
    )
    .bind(event.id, event.event_type, rawBody)
    .run();

  // Process based on event type
  if (event.event_type === "CHECKOUT.ORDER.APPROVED" || event.event_type === "CHECKOUT.ORDER.COMPLETED") {
    const orderId = event.resource.id;
    const customId = event.resource.purchase_units?.[0]?.custom_id;

    if (!customId) {
      return jsonResponse(error("MISSING_CUSTOM_ID", "No user ID in webhook"), 400);
    }

    const userId = parseInt(customId);
    if (isNaN(userId)) {
      return jsonResponse(error("INVALID_USER_ID", "Invalid user ID"), 400);
    }

    // Capture the order
    try {
      const capture = await capturePayPalOrder(env, orderId);

      if (capture.status === "COMPLETED") {
        // Update order status
        await env.DB
          .prepare(`UPDATE orders SET status = 'completed', updated_at = datetime('now') WHERE provider_order_id = ?`)
          .bind(orderId)
          .run();

        // Get plan from order
        const order = await env.DB
          .prepare("SELECT plan FROM orders WHERE provider_order_id = ?")
          .bind(orderId)
          .first<{ plan: string }>();

        const plan = order?.plan || "pro";

        // Add credits based on plan
        if (plan === "pro") {
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);
          await addCredits(env.DB, userId, 200, "purchase_pro", expiresAt.toISOString());

          // Update user plan
          await env.DB
            .prepare(`UPDATE users SET plan = 'pro', updated_at = datetime('now') WHERE id = ?`)
            .bind(userId)
            .run();

          // Create subscription record
          await env.DB
            .prepare(
              `INSERT INTO subscriptions (user_id, provider, provider_subscription_id, plan, status, current_period_end)
               VALUES (?, 'paypal', ?, 'pro', 'active', ?)`
            )
            .bind(userId, orderId, expiresAt.toISOString())
            .run();
        } else if (plan === "team") {
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);
          await addCredits(env.DB, userId, 600, "purchase_pro", expiresAt.toISOString());

          await env.DB
            .prepare(`UPDATE users SET plan = 'team', updated_at = datetime('now') WHERE id = ?`)
            .bind(userId)
            .run();

          await env.DB
            .prepare(
              `INSERT INTO subscriptions (user_id, provider, provider_subscription_id, plan, status, current_period_end)
               VALUES (?, 'paypal', ?, 'team', 'active', ?)`
            )
            .bind(userId, orderId, expiresAt.toISOString())
            .run();
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("PayPal capture error:", message);
      return jsonResponse(error("CAPTURE_ERROR", message), 500);
    }
  }

  return c.json(success({ message: "Webhook processed" }));
});

export default app;
