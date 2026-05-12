import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";

import healthRoutes from "./routes/health";
import authRoutes from "./routes/auth";
import generateRoutes from "./routes/generate";
import usageRoutes from "./routes/usage";
import checkoutRoutes from "./routes/checkout";
import webhookRoutes from "./routes/webhooks";

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use("*", cors({
  origin: (origin) => {
    // Allow same origin and localhost for dev
    if (!origin) return "*";
    if (origin.includes("meigenai.org")) return origin;
    if (origin.includes("localhost")) return origin;
    return null;
  },
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-client-id"],
  credentials: true,
}));

// API routes
app.route("/api/health", healthRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/generate", generateRoutes);
app.route("/api/usage", usageRoutes);
app.route("/api/checkout", checkoutRoutes);
app.route("/api/webhooks", webhookRoutes);

// R2 public access (for card images)
app.get("/r2/:key{.+}", async (c) => {
  const key = c.req.param("key");
  const obj = await c.env.R2.get(key);
  if (!obj) return c.notFound();

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("Cache-Control", "public, max-age=86400");

  return new Response(obj.body, { headers });
});

// Fallback for SPA / frontend assets
app.get("*", async (c) => {
  try {
    return await c.env.ASSETS.fetch(c.req.raw);
  } catch {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Not found" } }, 404);
  }
});

export default app;
