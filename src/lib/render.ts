/**
 * Server-side quote card rendering using Satori-like SVG generation.
 * For MVP, we generate SVG and convert to PNG via a simple rasterization.
 * In production, this could use @vercel/og or a WASM-based renderer.
 */

export interface RenderCardInput {
  quote: string;
  author: string;
  templateId: string;
  brandConfig?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    backgroundType?: "solid" | "gradient" | "image";
    backgroundValue?: string;
  };
  size?: string; // "1:1" | "4:5" | "9:16" | "16:9"
}

export interface RenderCardOutput {
  svg: string;
  width: number;
  height: number;
}

const SIZE_MAP: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
};

const TEMPLATES: Record<string, (input: RenderCardInput, w: number, h: number) => string> = {
  minimal: (input, w, h) => {
    const { quote, author, brandConfig } = input;
    const bg = brandConfig?.backgroundValue || "#0c0c0e";
    const primary = brandConfig?.primaryColor || "#d4a853";
    const font = brandConfig?.fontFamily || "serif";

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="${bg}"/>
      <rect x="${w * 0.08}" y="${h * 0.08}" width="${w * 0.84}" height="${h * 0.84}" fill="none" stroke="${primary}" stroke-width="2" opacity="0.3"/>
      <text x="${w / 2}" y="${h * 0.45}" text-anchor="middle" fill="#f5f0e8" font-family="${font}" font-size="${Math.min(w, h) * 0.055}" font-weight="500" line-height="1.4">
        <tspan x="${w / 2}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <line x1="${w * 0.45}" y1="${h * 0.58}" x2="${w * 0.55}" y2="${h * 0.58}" stroke="${primary}" stroke-width="2"/>
      <text x="${w / 2}" y="${h * 0.65}" text-anchor="middle" fill="${primary}" font-family="sans-serif" font-size="${Math.min(w, h) * 0.025}" letter-spacing="3" text-transform="uppercase">
        — ${escapeXml(author)}
      </text>
    </svg>`;
  },

  modern: (input, w, h) => {
    const { quote, author, brandConfig } = input;
    const bg = brandConfig?.backgroundValue || "#141416";
    const primary = brandConfig?.primaryColor || "#d4a853";
    const font = brandConfig?.fontFamily || "serif";

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1a1a1c;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <circle cx="${w * 0.85}" cy="${h * 0.15}" r="${Math.min(w, h) * 0.25}" fill="${primary}" opacity="0.05"/>
      <text x="${w * 0.1}" y="${h * 0.4}" fill="#f5f0e8" font-family="${font}" font-size="${Math.min(w, h) * 0.06}" font-weight="600" line-height="1.3">
        <tspan x="${w * 0.1}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <text x="${w * 0.1}" y="${h * 0.65}" fill="${primary}" font-family="sans-serif" font-size="${Math.min(w, h) * 0.028}" letter-spacing="2">
        — ${escapeXml(author)}
      </text>
    </svg>`;
  },

  classic: (input, w, h) => {
    const { quote, author, brandConfig } = input;
    const bg = brandConfig?.backgroundValue || "#f5f0e8";
    const primary = brandConfig?.primaryColor || "#1a1a1c";
    const font = brandConfig?.fontFamily || "serif";

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="${bg}"/>
      <rect x="${w * 0.05}" y="${h * 0.05}" width="${w * 0.9}" height="${h * 0.9}" fill="none" stroke="${primary}" stroke-width="1" opacity="0.2"/>
      <text x="${w / 2}" y="${h * 0.42}" text-anchor="middle" fill="${primary}" font-family="${font}" font-size="${Math.min(w, h) * 0.05}" font-style="italic" line-height="1.5">
        <tspan x="${w / 2}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <line x1="${w * 0.42}" y1="${h * 0.56}" x2="${w * 0.58}" y2="${h * 0.56}" stroke="${primary}" stroke-width="1" opacity="0.5"/>
      <text x="${w / 2}" y="${h * 0.62}" text-anchor="middle" fill="${primary}" font-family="sans-serif" font-size="${Math.min(w, h) * 0.022}" letter-spacing="4" opacity="0.7">
        ${escapeXml(author).toUpperCase()}
      </text>
    </svg>`;
  },
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderCardSVG(input: RenderCardInput): RenderCardOutput {
  const sizeKey = input.size || "1:1";
  const { width, height } = SIZE_MAP[sizeKey] || SIZE_MAP["1:1"];
  const templateFn = TEMPLATES[input.templateId] || TEMPLATES["minimal"];
  const svg = templateFn(input, width, height);

  return { svg, width, height };
}

/**
 * Convert SVG string to PNG ArrayBuffer.
 * In Cloudflare Workers, we can't use Canvas API directly.
 * Options:
 * 1. Return SVG and let frontend render it
 * 2. Use a third-party service to rasterize
 * 3. Use WASM-based renderer (resvg-wasm)
 *
 * For MVP, we'll return the SVG as a base64 data URL and store it in R2.
 * The frontend can render SVG directly or use html2canvas.
 */
export async function svgToPng(svg: string): Promise<ArrayBuffer> {
  // For now, return SVG as UTF-8 bytes (frontend handles rendering)
  // In production, integrate resvg-wasm for server-side PNG generation
  const encoder = new TextEncoder();
  return encoder.encode(svg).buffer;
}
