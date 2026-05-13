import { DEFAULT_TEMPLATE_ID, QUOTE_TEMPLATES, type QuoteTemplateDefinition } from "../templates/quote-templates";

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

export interface TemplateInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  previewQuote: string;
  previewAuthor: string;
  sizes: string;
  background: {
    from: string;
    to: string;
  };
  textColor: string;
  accentColor: string;
}

const SIZE_MAP: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function findTemplate(templateId: string): QuoteTemplateDefinition {
  const legacyMap: Record<string, string> = {
    minimal: "minimal-dark",
    modern: "editorial-warm",
    classic: "elegant-black",
  };
  const resolvedId = legacyMap[templateId] || templateId || DEFAULT_TEMPLATE_ID;
  return QUOTE_TEMPLATES.find((t) => t.id === resolvedId) || QUOTE_TEMPLATES[0];
}

type TextLayout = {
  lines: string[];
  fontSize: number;
  lineHeight: number;
};

function charWeight(ch: string): number {
  if (/\s/.test(ch)) return 0.35;
  // CJK, kana, hangul and full-width punctuation are roughly square.
  if (/[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af\uff00-\uffef]/.test(ch)) return 1;
  if (/[MW@#%&]/.test(ch)) return 0.85;
  if (/[il.,'`!|]/.test(ch)) return 0.32;
  return 0.58;
}

function textUnits(text: string): number {
  return Array.from(text).reduce((sum, ch) => sum + charWeight(ch), 0);
}

function tokenizeText(text: string): string[] {
  const normalized = text.trim().replace(/\s+/g, " ");
  const tokens: string[] = [];
  let latin = "";

  for (const ch of Array.from(normalized)) {
    const isLatinWord = /[A-Za-z0-9'’\-]/.test(ch);
    if (isLatinWord) {
      latin += ch;
      continue;
    }
    if (latin) {
      tokens.push(latin);
      latin = "";
    }
    if (/\s/.test(ch)) {
      tokens.push(" ");
    } else {
      tokens.push(ch);
    }
  }
  if (latin) tokens.push(latin);
  return tokens;
}

function wrapText(text: string, maxUnits: number, maxLines: number): string[] {
  const tokens = tokenizeText(text);
  const lines: string[] = [];
  let current = "";
  let currentUnits = 0;

  for (const token of tokens) {
    const tokenUnits = textUnits(token);
    const projected = currentUnits + tokenUnits;

    if (projected > maxUnits && current.trim()) {
      lines.push(current.trim());
      current = token.trimStart();
      currentUnits = textUnits(current);
      if (lines.length >= maxLines) break;
    } else {
      current += token;
      currentUnits = projected;
    }
  }

  if (current.trim() && lines.length < maxLines) {
    lines.push(current.trim());
  }

  // If a very long unbroken token still overflows, hard-split by characters.
  return lines.flatMap((line) => {
    if (textUnits(line) <= maxUnits) return [line];
    const chunks: string[] = [];
    let chunk = "";
    let units = 0;
    for (const ch of Array.from(line)) {
      const u = charWeight(ch);
      if (units + u > maxUnits && chunk) {
        chunks.push(chunk);
        chunk = ch;
        units = u;
      } else {
        chunk += ch;
        units += u;
      }
    }
    if (chunk) chunks.push(chunk);
    return chunks;
  }).slice(0, maxLines);
}

function buildTextLayout(text: string, boxWidth: number, boxHeight: number, preferredFontSize: number, maxLines = 6): TextLayout {
  let fontSize = preferredFontSize;
  const minFontSize = preferredFontSize * 0.52;
  const widthFactor = 0.98; // Conservative CJK-safe estimate. SVG/browser fonts render Hanzi close to 1em wide.

  while (fontSize >= minFontSize) {
    const maxUnits = boxWidth / (fontSize * widthFactor);
    const lines = wrapText(text, maxUnits, maxLines);
    const lineHeight = fontSize * 1.28;
    const totalHeight = lines.length * lineHeight;
    const widestLine = Math.max(...lines.map(textUnits), 1) * fontSize * widthFactor;
    if (totalHeight <= boxHeight && widestLine <= boxWidth) {
      return { lines, fontSize, lineHeight };
    }
    fontSize *= 0.92;
  }

  const lineHeight = minFontSize * 1.28;
  return {
    lines: wrapText(text, boxWidth / (minFontSize * widthFactor), maxLines),
    fontSize: minFontSize,
    lineHeight,
  };
}

function renderTextLines(args: {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fill: string;
  anchor?: "start" | "middle";
  family?: string;
  weight?: string;
  style?: string;
  maxLines?: number;
}) {
  const layout = buildTextLayout(args.text, args.width, args.height, args.fontSize, args.maxLines || 6);
  const totalHeight = (layout.lines.length - 1) * layout.lineHeight;
  const startY = args.y - totalHeight / 2;

  return `<text x="${args.x}" y="${startY}" text-anchor="${args.anchor || "middle"}" fill="${args.fill}" font-family="${args.family || "Georgia, 'Noto Serif SC', 'Noto Sans CJK SC', serif"}" font-size="${layout.fontSize}" font-weight="${args.weight || "500"}"${args.style ? ` font-style="${args.style}"` : ""}>
    ${layout.lines.map((line, i) => `<tspan x="${args.x}" dy="${i === 0 ? 0 : layout.lineHeight}">${escapeXml(line)}</tspan>`).join("\n")}
  </text>`;
}

function renderCentered(input: RenderCardInput, template: QuoteTemplateDefinition, w: number, h: number) {
  const fontSize = Math.min(w, h) * 0.048;
  const quote = input.quote;
  return `<rect x="${w * 0.08}" y="${h * 0.08}" width="${w * 0.84}" height="${h * 0.84}" fill="none" stroke="${template.accentColor}" stroke-width="2" opacity="0.25"/>
    ${renderTextLines({ text: quote, x: w / 2, y: h * 0.43, width: w * 0.56, height: h * 0.34, fontSize, fill: template.textColor, maxLines: 6 })}
    <line x1="${w * 0.44}" y1="${h * 0.66}" x2="${w * 0.56}" y2="${h * 0.66}" stroke="${template.accentColor}" stroke-width="2"/>
    <text x="${w / 2}" y="${h * 0.73}" text-anchor="middle" fill="${template.accentColor}" font-family="Arial, 'Noto Sans CJK SC', sans-serif" font-size="${fontSize * 0.42}" letter-spacing="2">— ${escapeXml(input.author)}</text>`;
}

function renderMagazine(input: RenderCardInput, template: QuoteTemplateDefinition, w: number, h: number) {
  const fontSize = Math.min(w, h) * 0.052;
  return `<rect x="${w * 0.06}" y="${h * 0.06}" width="${w * 0.88}" height="${h * 0.12}" fill="#000000" opacity="0.16"/>
    <text x="${w * 0.09}" y="${h * 0.125}" fill="${template.accentColor}" font-family="Arial, sans-serif" font-size="${fontSize * 0.38}" letter-spacing="7">MEIGEN QUOTE</text>
    ${renderTextLines({ text: input.quote, x: w * 0.1, y: h * 0.48, width: w * 0.76, height: h * 0.32, fontSize, fill: template.textColor, anchor: "start", weight: "600", style: "italic", maxLines: 5 })}
    <line x1="${w * 0.1}" y1="${h * 0.68}" x2="${w * 0.38}" y2="${h * 0.68}" stroke="${template.accentColor}" stroke-width="3"/>
    <text x="${w * 0.1}" y="${h * 0.75}" fill="${template.mutedColor}" font-family="Arial, sans-serif" font-size="${fontSize * 0.38}" letter-spacing="2">WORDS BY ${escapeXml(input.author).toUpperCase()}</text>`;
}

function renderLeftBold(input: RenderCardInput, template: QuoteTemplateDefinition, w: number, h: number) {
  const fontSize = Math.min(w, h) * 0.057;
  return `<circle cx="${w * 0.82}" cy="${h * 0.18}" r="${Math.min(w, h) * 0.24}" fill="${template.accentColor}" opacity="0.08"/>
    <rect x="${w * 0.08}" y="${h * 0.2}" width="${w * 0.015}" height="${h * 0.45}" fill="${template.accentColor}"/>
    ${renderTextLines({ text: input.quote, x: w * 0.14, y: h * 0.44, width: w * 0.7, height: h * 0.32, fontSize, fill: template.textColor, anchor: "start", family: "Georgia, 'Noto Serif SC', 'Noto Sans CJK SC', serif", weight: "700", maxLines: 5 })}
    <text x="${w * 0.14}" y="${h * 0.7}" fill="${template.accentColor}" font-family="Arial, sans-serif" font-size="${fontSize * 0.42}" letter-spacing="4" font-weight="700">${escapeXml(input.author).toUpperCase()}</text>`;
}

function renderElegantFrame(input: RenderCardInput, template: QuoteTemplateDefinition, w: number, h: number) {
  const fontSize = Math.min(w, h) * 0.054;
  return `<rect x="${w * 0.06}" y="${h * 0.06}" width="${w * 0.88}" height="${h * 0.88}" fill="none" stroke="${template.accentColor}" stroke-width="2" opacity="0.45"/>
    <rect x="${w * 0.09}" y="${h * 0.09}" width="${w * 0.82}" height="${h * 0.82}" fill="none" stroke="${template.accentColor}" stroke-width="1" opacity="0.16"/>
    <circle cx="${w / 2}" cy="${h * 0.24}" r="5" fill="${template.accentColor}" opacity="0.65"/>
    ${renderTextLines({ text: input.quote, x: w / 2, y: h * 0.47, width: w * 0.66, height: h * 0.3, fontSize, fill: template.textColor, style: "italic", maxLines: 5 })}
    <text x="${w / 2}" y="${h * 0.72}" text-anchor="middle" fill="${template.mutedColor}" font-family="Georgia, serif" font-size="${fontSize * 0.42}" letter-spacing="3">— ${escapeXml(input.author)}</text>`;
}

export function renderCardSVG(input: RenderCardInput): RenderCardOutput {
  const sizeKey = input.size || "1:1";
  const { width, height } = SIZE_MAP[sizeKey] || SIZE_MAP["1:1"];
  const template = findTemplate(input.templateId);
  const gradientId = `bg-${template.id.replace(/[^a-z0-9-]/gi, "-")}`;
  const bgFrom = input.brandConfig?.backgroundValue || template.background.from;
  const bgTo = template.background.to;

  const body =
    template.layout === "magazine"
      ? renderMagazine(input, template, width, height)
      : template.layout === "leftBold"
        ? renderLeftBold(input, template, width, height)
        : template.layout === "elegantFrame"
          ? renderElegantFrame(input, template, width, height)
          : renderCentered(input, template, width, height);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgFrom}"/>
        <stop offset="100%" stop-color="${bgTo}"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#${gradientId})"/>
    ${body}
  </svg>`;

  return { svg, width, height };
}

/**
 * Convert SVG string to bytes for storage.
 * Returns SVG as UTF-8 bytes (frontend can render SVG directly or convert to PNG via canvas)
 */
export async function svgToBytes(svg: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return encoder.encode(svg).buffer;
}

/**
 * Get list of all available templates.
 * Canonical source: src/templates/quote-templates.ts
 */
export function getTemplates(): TemplateInfo[] {
  return QUOTE_TEMPLATES.map(({ id, name, category, description, previewQuote, previewAuthor, sizes, background, textColor, accentColor }) => ({
    id,
    name,
    category,
    description,
    previewQuote,
    previewAuthor,
    sizes,
    background,
    textColor,
    accentColor,
  }));
}

export function getTemplatesByCategory(category: string): TemplateInfo[] {
  return getTemplates().filter((t) => t.category.toLowerCase() === category.toLowerCase());
}
