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

export async function generateQuote(
  env: Env,
  input: GenerateQuoteInput
): Promise<GenerateQuoteOutput> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = env.OPENAI_MODEL || "gpt-4o-mini";

  const systemPrompt = `You are an expert quote writer. Generate an original, inspiring quote based on the user's topic and preferences. Respond ONLY with a JSON object in this exact format:
{"quote": "the quote text", "author": "Author Name"}
The quote should feel authentic and memorable. The author should be "Meigen AI" for original quotes, or a real historical figure if adapting a classic.`;

  const userPrompt = `Topic: ${input.topic}${input.style ? `\nStyle: ${input.style}` : ""}${input.length ? `\nLength: ${input.length}` : ""}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
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
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = data.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  const parsed = JSON.parse(content) as GenerateQuoteOutput;
  return parsed;
}
