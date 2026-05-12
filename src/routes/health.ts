import { Hono } from "hono";
import type { Env } from "../types";
import { success } from "../lib/response";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
  return c.json(success({ status: "ok", timestamp: new Date().toISOString() }));
});

export default app;
