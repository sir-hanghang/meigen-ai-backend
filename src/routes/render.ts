import { Hono } from "hono";
import type { Env } from "../types";
import { success, error, jsonResponse } from "../lib/response";
import { renderCardSVG, svgToBytes, getTemplates, getTemplatesByCategory } from "../lib/render";
import { uploadImage } from "../lib/r2";

const app = new Hono<{ Bindings: Env }>();

// GET /api/templates - List all available templates
app.get("/templates", (c) => {
  const category = c.req.query("category");
  const templates = category ? getTemplatesByCategory(category) : getTemplates();
  return c.json(success({ templates, total: templates.length }));
});

// POST /api/render - Render a quote card
app.post("/", async (c) => {
  const env = c.env;
  const body = await c.req.json<{
    quote: string;
    author: string;
    templateId?: string;
    size?: string;
    brandConfig?: Record<string, string>;
    format?: "svg" | "png" | "jpg";
  }>();

  const { quote, author, templateId = "minimal-dark", size = "1:1", brandConfig, format = "svg" } = body;

  if (!quote || !author) {
    return jsonResponse(error("MISSING_PARAMS", "quote and author are required"), 400);
  }

  try {
    const renderResult = renderCardSVG({
      quote,
      author,
      templateId,
      brandConfig,
      size,
    });

    // For now, return SVG data URL. In production, could convert to PNG via WASM
    const svgBase64 = btoa(unescape(encodeURIComponent(renderResult.svg)));
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

    // If format is not svg, we still return SVG (frontend handles conversion)
    // In future: integrate resvg-wasm for server-side PNG generation
    return c.json(success({
      templateId,
      size,
      width: renderResult.width,
      height: renderResult.height,
      svg: renderResult.svg,
      dataUrl,
      format,
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(error("RENDER_FAILED", message), 500);
  }
});

// POST /api/render/upload - Render and upload to R2
app.post("/upload", async (c) => {
  const env = c.env;
  const body = await c.req.json<{
    quote: string;
    author: string;
    templateId?: string;
    size?: string;
    brandConfig?: Record<string, string>;
    jobId?: number;
  }>();

  const { quote, author, templateId = "minimal-dark", size = "1:1", brandConfig, jobId } = body;

  if (!quote || !author) {
    return jsonResponse(error("MISSING_PARAMS", "quote and author are required"), 400);
  }

  try {
    const renderResult = renderCardSVG({ quote, author, templateId, brandConfig, size });
    const svgBytes = await svgToBytes(renderResult.svg);
    const r2Key = `cards/${jobId || Date.now()}_${templateId}_${size.replace(":", "x")}.svg`;

    await uploadImage(env.R2, r2Key, svgBytes, "image/svg+xml");

    const publicUrl = `${env.APP_ORIGIN || "https://meigenai.org"}/r2/${r2Key}`;

    return c.json(success({
      url: publicUrl,
      key: r2Key,
      templateId,
      size,
      width: renderResult.width,
      height: renderResult.height,
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(error("RENDER_UPLOAD_FAILED", message), 500);
  }
});

export default app;
