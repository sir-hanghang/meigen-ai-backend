import { Hono } from "hono";
import { success } from "../lib/response";
import { getTemplates, getTemplatesByCategory } from "../lib/render";

const app = new Hono();

// GET /api/templates - List all available templates
app.get("/", (c) => {
  const category = c.req.query("category");
  const templates = category ? getTemplatesByCategory(category) : getTemplates();
  return c.json(success({ templates, total: templates.length }));
});

export default app;
