import type { Env } from "../types";

export interface GenerateQuoteInput {
  topic: string;
  style?: string;
  length?: string;
}

export interface GenerateQuoteOutput {
  quote: string;
  author: string;
}

export class AiProviderError extends Error {
  status: number;
  providerCode?: string;
  retryable: boolean;

  constructor(message: string, status: number, providerCode?: string, retryable = false) {
    super(message);
    this.name = "AiProviderError";
    this.status = status;
    this.providerCode = providerCode;
    this.retryable = retryable;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryableProviderError(status: number, body: string): boolean {
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  return /engine_overloaded|overloaded|rate.?limit|temporarily unavailable/i.test(body);
}

function extractProviderMessage(body: string): { message: string; code?: string } {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string; type?: string; code?: string } };
    return {
      message: parsed.error?.message || body,
      code: parsed.error?.type || parsed.error?.code,
    };
  } catch {
    return { message: body };
  }
}

export async function generateQuote(
  env: Env,
  input: GenerateQuoteInput
): Promise<GenerateQuoteOutput> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = env.OPENAI_MODEL || "gpt-4o-mini";

  const systemPrompt = `You are a quote curator for a visual quote-card product.
Prefer a real, widely attributed quote from a known historical figure, writer, philosopher, scientist, artist, entrepreneur, or public figure that matches the user's topic.
Return the quote in the user's language when a reliable translation is natural; otherwise use the original/common English quote.
Keep the quote concise enough for a social card: ideally 16-36 Chinese characters or 8-18 English words.
Do NOT invent a fake attribution. If you cannot identify a suitable real quote, write a concise original quote and set author to "Meigen AI".
Respond ONLY with a JSON object in this exact format:
{"quote": "the quote text without surrounding quotation marks", "author": "Real Author Name"}`;

  const userPrompt = `Topic: ${input.topic}${input.style ? `\nStyle: ${input.style}` : ""}${input.length ? `\nLength: ${input.length}` : ""}`;

  const baseUrl = env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  let lastError: AiProviderError | null = null;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "MeigenAI/1.0",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 256,
        response_format: { type: "json_object" },
      }),
      // @ts-ignore - Cloudflare-specific fetch options
      cf: {
        cacheEverything: false,
        cacheTtl: 0,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      const retryable = isRetryableProviderError(res.status, body);
      const provider = extractProviderMessage(body);
      lastError = new AiProviderError(provider.message, res.status, provider.code, retryable);

      if (retryable && attempt < maxAttempts) {
        // Keep total added latency low for Workers/mobile UX: ~0.8s + ~1.6s.
        await sleep(800 * attempt);
        continue;
      }

      throw lastError;
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from AI provider");
    }

    try {
      return JSON.parse(content) as GenerateQuoteOutput;
    } catch {
      throw new Error("Invalid JSON response from AI provider");
    }
  }

  throw lastError || new Error("AI provider request failed");
}
