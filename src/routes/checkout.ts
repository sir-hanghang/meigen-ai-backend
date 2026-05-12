import { Hono } from "hono";
import type { Env } from "../types";
import { success, error, jsonResponse } from "../lib/response";
import { getCurrentUser } from "../lib/session";
import { createPayPalOrder } from "../lib/paypal";

const app = new Hono<{ Bindings: Env }>();

// POST /api/checkout/paypal
app.post("/paypal", async (c) => {
  const env = c.env;
  const user = await getCurrentUser(c.req.raw, env);

  if (!user) {
    return jsonResponse(error("AUTH_REQUIRED", "Please login first"), 401);
  }

  const body = await c.req.json<{
    plan: string;
    amount: string;
    currency?: string;
  }>();

  const { plan, amount, currency = "USD" } = body;

  if (!plan || !amount) {
    return jsonResponse(error("MISSING_PARAMS", "plan and amount are required"), 400);
  }

  const origin = env.APP_ORIGIN || "https://meigenai.org";
  const returnUrl = `${origin}/api/checkout/paypal/capture`;
  const cancelUrl = `${origin}/pricing`;

  try {
    const order = await createPayPalOrder(env, {
      userId: user.userId,
      plan,
      amount,
      currency,
      returnUrl,
      cancelUrl,
    });

    // Store order in DB
    await env.DB
      .prepare(
        `INSERT INTO orders (user_id, provider, provider_order_id, plan, amount, currency, status)
         VALUES (?, 'paypal', ?, ?, ?, ?, 'pending')`
      )
      .bind(user.userId, order.orderId, plan, amount, currency)
      .run();

    return c.json(success({ orderId: order.orderId, approvalUrl: order.approvalUrl }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(error("CHECKOUT_ERROR", message), 500);
  }
});

export default app;
