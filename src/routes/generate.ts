import { Hono } from "hono";
import type { Env } from "../types";
import { success, error, jsonResponse } from "../lib/response";
import { getCurrentUser } from "../lib/session";
import { generateQuote } from "../lib/ai";
import { renderCardSVG, svgToBytes } from "../lib/render";
import { uploadImage } from "../lib/r2";
import {
  getCreditBalance,
  deductCredits,
  getAnonymousUsage,
  incrementAnonymousUsage,
} from "../lib/credits";

const app = new Hono<{ Bindings: Env }>();

// POST /api/generate - Generate quote text
app.post("/", async (c) => {
  const env = c.env;
  const body = await c.req.json<{
    topic?: string;
    category?: string;
    style?: string;
    length?: string;
    templateId?: string;
    brandConfig?: Record<string, string>;
    size?: string;
    clientId?: string;
  }>();

  // Support both 'topic' (backend native) and 'category' (frontend PRD naming)
  const topic = body.topic || body.category;
  const { style, length, templateId, brandConfig, size, clientId } = body;

  if (!topic) {
    return jsonResponse(error("MISSING_TOPIC", "Topic or category is required"), 400);
  }

  const user = await getCurrentUser(c.req.raw, env);
  const db = env.DB;
  const creditsPerGen = parseInt(env.CREDITS_PER_GENERATION || "1");

  // Check credits / anonymous limit
  if (user) {
    const balance = await getCreditBalance(db, user.userId);
    if (balance.total < creditsPerGen) {
      return jsonResponse(error("INSUFFICIENT_CREDITS", "Not enough credits. Please upgrade to Pro."), 402);
    }
  } else {
    // Anonymous user
    const dailyLimit = parseInt(env.ANONYMOUS_DAILY_FREE_LIMIT || "3");
    const today = new Date().toISOString().split("T")[0];
    const clientIdHash = clientId
      ? await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clientId)).then((b) =>
          Array.from(new Uint8Array(b))
            .map((x) => x.toString(16).padStart(2, "0"))
            .join("")
        )
      : "anonymous";

    const used = await getAnonymousUsage(db, clientIdHash, today);
    if (used >= dailyLimit) {
      return jsonResponse(
        error("DAILY_LIMIT_REACHED", `Daily free limit (${dailyLimit}) reached. Please sign up or upgrade to Pro.`),
        429
      );
    }
  }

  // Create job record
  const jobResult = await db
    .prepare(
      `INSERT INTO generation_jobs (user_id, client_id, status, topic, style, length, template_id, brand_config, size, credits_used)
       VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      user?.userId ?? null,
      clientId ?? null,
      topic,
      style ?? null,
      length ?? null,
      templateId ?? null,
      brandConfig ? JSON.stringify(brandConfig) : null,
      size ?? null,
      creditsPerGen
    )
    .run();

  const jobId = jobResult.meta?.last_row_id;
  if (!jobId) {
    return jsonResponse(error("JOB_CREATE_ERROR", "Failed to create generation job"), 500);
  }

  // Generate quote via OpenAI
  try {
    const quoteResult = await generateQuote(env, { topic, style, length });

    // Update job with quote
    await db
      .prepare(
        `UPDATE generation_jobs SET status = 'processing', quote_text = ?, quote_author = ?, updated_at = datetime('now') WHERE id = ?`
      )
      .bind(quoteResult.quote, quoteResult.author, jobId)
      .run();

    // Deduct credits or increment anonymous usage
    if (user) {
      const deducted = await deductCredits(db, user.userId, creditsPerGen);
      if (!deducted) {
        await db
          .prepare(`UPDATE generation_jobs SET status = 'failed', error_message = 'Credit deduction failed' WHERE id = ?`)
          .bind(jobId)
          .run();
        return jsonResponse(error("CREDIT_DEDUCTION_FAILED", "Failed to deduct credits"), 500);
      }
    } else {
      const today = new Date().toISOString().split("T")[0];
      const clientIdHash = clientId
        ? await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clientId)).then((b) =>
            Array.from(new Uint8Array(b))
              .map((x) => x.toString(16).padStart(2, "0"))
              .join("")
          )
        : "anonymous";
      await incrementAnonymousUsage(db, clientIdHash, today);
    }

    // Record usage
    await db
      .prepare(
        `INSERT INTO usage_records (user_id, client_id, job_id, action, credits_used) VALUES (?, ?, ?, 'generate_quote', ?)`
      )
      .bind(user?.userId ?? null, clientId ?? null, jobId, creditsPerGen)
      .run();

    // If template specified, render card
    let imageUrl: string | null = null;
    if (templateId) {
      try {
        const renderResult = renderCardSVG({
          quote: quoteResult.quote,
          author: quoteResult.author,
          templateId,
          brandConfig,
          size,
        });

        const svgBuffer = await svgToBytes(renderResult.svg);
        const r2Key = `cards/${jobId}.svg`;
        await uploadImage(env.R2, r2Key, svgBuffer, "image/svg+xml");

        // In production with R2 public domain: imageUrl = `https://r2.meigenai.org/${r2Key}`
        imageUrl = `/r2/${r2Key}`;

        await db
          .prepare(`UPDATE generation_jobs SET status = 'succeeded', image_url = ? WHERE id = ?`)
          .bind(imageUrl, jobId)
          .run();
      } catch (renderErr) {
        console.error("Render error:", renderErr);
        await db
          .prepare(`UPDATE generation_jobs SET status = 'failed', error_message = ? WHERE id = ?`)
          .bind(String(renderErr), jobId)
          .run();
      }
    } else {
      await db
        .prepare(`UPDATE generation_jobs SET status = 'succeeded' WHERE id = ?`)
        .bind(jobId)
        .run();
    }

    return c.json(
      success({
        jobId,
        status: "succeeded",
        quote: quoteResult.quote,
        author: quoteResult.author,
        imageUrl,
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .prepare(`UPDATE generation_jobs SET status = 'failed', error_message = ? WHERE id = ?`)
      .bind(message, jobId)
      .run();

    return jsonResponse(error("GENERATION_FAILED", message), 500);
  }
});

// GET /api/generate/:id - Get job status
app.get("/:id", async (c) => {
  const db = c.env.DB;
  const jobId = parseInt(c.req.param("id"));

  if (isNaN(jobId)) {
    return jsonResponse(error("INVALID_JOB_ID", "Invalid job ID"), 400);
  }

  const job = await db
    .prepare("SELECT * FROM generation_jobs WHERE id = ?")
    .bind(jobId)
    .first<{
      id: number;
      status: string;
      quote_text: string | null;
      quote_author: string | null;
      image_url: string | null;
      error_message: string | null;
      created_at: string;
    }>();

  if (!job) {
    return jsonResponse(error("JOB_NOT_FOUND", "Job not found"), 404);
  }

  return c.json(
    success({
      jobId: job.id,
      status: job.status,
      quote: job.quote_text,
      author: job.quote_author,
      imageUrl: job.image_url,
      error: job.error_message,
      createdAt: job.created_at,
    })
  );
});

export default app;
