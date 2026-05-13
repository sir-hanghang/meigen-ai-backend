/**
 * Server-side quote card rendering using SVG generation.
 * 20+ templates across 5 categories: Minimal, Editorial, Bold, Elegant, Nature
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

export interface TemplateInfo {
  id: string;
  name: string;
  category: string;
  description: string;
}

const SIZE_MAP: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
};

// Template registry - 20+ templates
export const TEMPLATE_REGISTRY: TemplateInfo[] = [
  // Minimal
  { id: "minimal-dark", name: "Dark Frame", category: "Minimal", description: "Clean dark background with gold border" },
  { id: "minimal-light", name: "Light Frame", category: "Minimal", description: "Light background with subtle border" },
  { id: "minimal-line", name: "Single Line", category: "Minimal", description: "One horizontal accent line" },
  { id: "minimal-dot", name: "Dot Accent", category: "Minimal", description: "Minimal dot decoration" },
  { id: "minimal-center", name: "Centered", category: "Minimal", description: "Perfectly centered text" },
  // Editorial
  { id: "editorial-magazine", name: "Magazine", category: "Editorial", description: "Magazine-style layout with byline" },
  { id: "editorial-newspaper", name: "Newspaper", category: "Editorial", description: "Classic newspaper column style" },
  { id: "editorial-modern", name: "Modern Editorial", category: "Editorial", description: "Contemporary editorial design" },
  { id: "editorial-quote", name: "Quote Block", category: "Editorial", description: "Large quotation mark accent" },
  { id: "editorial-sidebar", name: "Sidebar", category: "Editorial", description: "Text with side accent bar" },
  // Bold
  { id: "bold-gradient", name: "Gradient Burst", category: "Bold", description: "Vibrant gradient background" },
  { id: "bold-typography", name: "Big Type", category: "Bold", description: "Oversized typography focus" },
  { id: "bold-contrast", name: "High Contrast", category: "Bold", description: "Black and white strong contrast" },
  { id: "bold-neon", name: "Neon Glow", category: "Bold", description: "Glowing text effect" },
  { id: "bold-brush", name: "Brush Stroke", category: "Bold", description: "Paint brush accent behind text" },
  // Elegant
  { id: "elegant-script", name: "Script", category: "Elegant", description: "Elegant script-style presentation" },
  { id: "elegant-gold", name: "Gold Leaf", category: "Elegant", description: "Gold leaf texture accents" },
  { id: "elegant-floral", name: "Floral", category: "Elegant", description: "Subtle floral decorations" },
  { id: "elegant-vintage", name: "Vintage", category: "Elegant", description: "Vintage paper texture look" },
  { id: "elegant-ornament", name: "Ornament", category: "Elegant", description: "Decorative corner ornaments" },
  // Nature
  { id: "nature-leaf", name: "Leaf", category: "Nature", description: "Organic leaf motif" },
  { id: "nature-sky", name: "Sky", category: "Nature", description: "Sky gradient with clouds" },
  { id: "nature-ocean", name: "Ocean", category: "Nature", description: "Deep ocean blue gradient" },
  { id: "nature-stone", name: "Stone", category: "Nature", description: "Stone texture background" },
];

// SVG Template generators
const TEMPLATES: Record<string, (input: RenderCardInput, w: number, h: number) => string> = {
  // === MINIMAL ===
  "minimal-dark": (input, w, h) => {
    const { quote, author, brandConfig } = input;
    const bg = brandConfig?.backgroundValue || "#0c0c0e";
    const primary = brandConfig?.primaryColor || "#d4a853";
    const fontSize = Math.min(w, h) * 0.055;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="${bg}"/>
      <rect x="${w * 0.08}" y="${h * 0.08}" width="${w * 0.84}" height="${h * 0.84}" fill="none" stroke="${primary}" stroke-width="2" opacity="0.3"/>
      <text x="${w / 2}" y="${h * 0.45}" text-anchor="middle" fill="#f5f0e8" font-family="Georgia, serif" font-size="${fontSize}" font-weight="500">
        <tspan x="${w / 2}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <line x1="${w * 0.45}" y1="${h * 0.58}" x2="${w * 0.55}" y2="${h * 0.58}" stroke="${primary}" stroke-width="2"/>
      <text x="${w / 2}" y="${h * 0.65}" text-anchor="middle" fill="${primary}" font-family="sans-serif" font-size="${fontSize * 0.45}" letter-spacing="3">— ${escapeXml(author)}</text>
    </svg>`;
  },

  "minimal-light": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.055;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#f5f0e8"/>
      <rect x="${w * 0.06}" y="${h * 0.06}" width="${w * 0.88}" height="${h * 0.88}" fill="none" stroke="#1a1a1c" stroke-width="1" opacity="0.15"/>
      <text x="${w / 2}" y="${h * 0.45}" text-anchor="middle" fill="#1a1a1c" font-family="Georgia, serif" font-size="${fontSize}" font-weight="500">
        <tspan x="${w / 2}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <line x1="${w * 0.45}" y1="${h * 0.58}" x2="${w * 0.55}" y2="${h * 0.58}" stroke="#1a1a1c" stroke-width="1" opacity="0.4"/>
      <text x="${w / 2}" y="${h * 0.65}" text-anchor="middle" fill="#1a1a1c" font-family="sans-serif" font-size="${fontSize * 0.45}" letter-spacing="3" opacity="0.7">— ${escapeXml(author)}</text>
    </svg>`;
  },

  "minimal-line": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.055;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#0c0c0e"/>
      <line x1="${w * 0.15}" y1="${h * 0.35}" x2="${w * 0.85}" y2="${h * 0.35}" stroke="#d4a853" stroke-width="1" opacity="0.3"/>
      <text x="${w / 2}" y="${h * 0.48}" text-anchor="middle" fill="#f5f0e8" font-family="Georgia, serif" font-size="${fontSize}" font-weight="500">
        <tspan x="${w / 2}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <line x1="${w * 0.15}" y1="${h * 0.62}" x2="${w * 0.85}" y2="${h * 0.62}" stroke="#d4a853" stroke-width="1" opacity="0.3"/>
      <text x="${w / 2}" y="${h * 0.72}" text-anchor="middle" fill="#a09b94" font-family="sans-serif" font-size="${fontSize * 0.45}" letter-spacing="3">— ${escapeXml(author)}</text>
    </svg>`;
  },

  "minimal-dot": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.055;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#0c0c0e"/>
      <circle cx="${w / 2}" cy="${h * 0.25}" r="4" fill="#d4a853" opacity="0.5"/>
      <text x="${w / 2}" y="${h * 0.45}" text-anchor="middle" fill="#f5f0e8" font-family="Georgia, serif" font-size="${fontSize}" font-weight="500">
        <tspan x="${w / 2}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <circle cx="${w / 2}" cy="${h * 0.62}" r="3" fill="#d4a853" opacity="0.3"/>
      <text x="${w / 2}" y="${h * 0.72}" text-anchor="middle" fill="#a09b94" font-family="sans-serif" font-size="${fontSize * 0.45}" letter-spacing="3">— ${escapeXml(author)}</text>
    </svg>`;
  },

  "minimal-center": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.06;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#0c0c0e"/>
      <text x="${w / 2}" y="${h * 0.42}" text-anchor="middle" fill="#f5f0e8" font-family="Georgia, serif" font-size="${fontSize}" font-weight="500">
        <tspan x="${w / 2}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <text x="${w / 2}" y="${h * 0.58}" text-anchor="middle" fill="#d4a853" font-family="sans-serif" font-size="${fontSize * 0.4}" letter-spacing="4">— ${escapeXml(author).toUpperCase()}</text>
    </svg>`;
  },

  // === EDITORIAL ===
  "editorial-magazine": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.05;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#141416"/>
      <rect x="${w * 0.05}" y="${h * 0.05}" width="${w * 0.9}" height="${h * 0.15}" fill="#1a1a1c"/>
      <text x="${w * 0.08}" y="${h * 0.12}" fill="#d4a853" font-family="sans-serif" font-size="${fontSize * 0.5}" letter-spacing="6">MEIGEN QUOTE</text>
      <text x="${w * 0.08}" y="${h * 0.45}" fill="#f5f0e8" font-family="Georgia, serif" font-size="${fontSize}" font-weight="600" font-style="italic">
        <tspan x="${w * 0.08}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <line x1="${w * 0.08}" y1="${h * 0.58}" x2="${w * 0.35}" y2="${h * 0.58}" stroke="#d4a853" stroke-width="2"/>
      <text x="${w * 0.08}" y="${h * 0.66}" fill="#a09b94" font-family="sans-serif" font-size="${fontSize * 0.45}" letter-spacing="2">WORDS BY ${escapeXml(author).toUpperCase()}</text>
    </svg>`;
  },

  "editorial-newspaper": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.045;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#f5f0e8"/>
      <line x1="${w * 0.08}" y1="${h * 0.12}" x2="${w * 0.92}" y2="${h * 0.12}" stroke="#1a1a1c" stroke-width="2"/>
      <line x1="${w * 0.08}" y1="${h * 0.14}" x2="${w * 0.92}" y2="${h * 0.14}" stroke="#1a1a1c" stroke-width="0.5"/>
      <text x="${w / 2}" y="${h * 0.22}" text-anchor="middle" fill="#1a1a1c" font-family="serif" font-size="${fontSize * 0.6}" letter-spacing="8">THE DAILY QUOTE</text>
      <line x1="${w * 0.08}" y1="${h * 0.26}" x2="${w * 0.92}" y2="${h * 0.26}" stroke="#1a1a1c" stroke-width="0.5"/>
      <text x="${w * 0.08}" y="${h * 0.45}" fill="#1a1a1c" font-family="Georgia, serif" font-size="${fontSize}" font-weight="500">
        <tspan x="${w * 0.08}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <text x="${w * 0.08}" y="${h * 0.62}" fill="#1a1a1c" font-family="sans-serif" font-size="${fontSize * 0.45}" font-style="italic">— ${escapeXml(author)}</text>
      <line x1="${w * 0.08}" y1="${h * 0.88}" x2="${w * 0.92}" y2="${h * 0.88}" stroke="#1a1a1c" stroke-width="1"/>
    </svg>`;
  },

  "editorial-modern": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.055;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a1c"/>
          <stop offset="100%" style="stop-color:#0c0c0e"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad1)"/>
      <rect x="0" y="0" width="${w * 0.04}" height="100%" fill="#d4a853"/>
      <text x="${w * 0.12}" y="${h * 0.42}" fill="#f5f0e8" font-family="Georgia, serif" font-size="${fontSize}" font-weight="600">
        <tspan x="${w * 0.12}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <text x="${w * 0.12}" y="${h * 0.58}" fill="#d4a853" font-family="sans-serif" font-size="${fontSize * 0.45}" letter-spacing="2">— ${escapeXml(author)}</text>
    </svg>`;
  },

  "editorial-quote": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.055;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#0c0c0e"/>
      <text x="${w * 0.1}" y="${h * 0.28}" fill="#d4a853" font-family="serif" font-size="${fontSize * 2}" opacity="0.2">"</text>
      <text x="${w * 0.15}" y="${h * 0.45}" fill="#f5f0e8" font-family="Georgia, serif" font-size="${fontSize}" font-weight="500">
        <tspan x="${w * 0.15}" dy="0">${escapeXml(quote)}</tspan>
      </text>
      <text x="${w * 0.15}" y="${h * 0.62}" fill="#a09b94" font-family="sans-serif" font-size="${fontSize * 0.45}" letter-spacing="3">— ${escapeXml(author)}</text>
    </svg>`;
  },

  "editorial-sidebar": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.055;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#141416"/>
      <rect x="${w * 0.08}" y="${h * 0.2}" width="4" height="${h * 0.6}" fill="#d4a853"/>
      <text x="${w * 0.12}" y="${h * 0.45}" fill="#f5f0e8" font-family="Georgia, serif" font-size="${fontSize}" font-weight="500">
        <tspan x="${w * 0.12}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <text x="${w * 0.12}" y="${h * 0.6}" fill="#d4a853" font-family="sans-serif" font-size="${fontSize * 0.45}" letter-spacing="2">— ${escapeXml(author)}</text>
    </svg>`;
  },

  // === BOLD ===
  "bold-gradient": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.055;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="boldgrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2d1b4e"/>
          <stop offset="50%" style="stop-color:#1a1a3e"/>
          <stop offset="100%" style="stop-color:#0c0c1e"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#boldgrad)"/>
      <circle cx="${w * 0.8}" cy="${h * 0.2}" r="${Math.min(w, h) * 0.3}" fill="#d4a853" opacity="0.08"/>
      <text x="${w / 2}" y="${h * 0.45}" text-anchor="middle" fill="#f5f0e8" font-family="Georgia, serif" font-size="${fontSize}" font-weight="700">
        <tspan x="${w / 2}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <text x="${w / 2}" y="${h * 0.62}" text-anchor="middle" fill="#d4a853" font-family="sans-serif" font-size="${fontSize * 0.5}" letter-spacing="4" font-weight="600">${escapeXml(author).toUpperCase()}</text>
    </svg>`;
  },

  "bold-typography": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.075;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#0c0c0e"/>
      <text x="${w * 0.08}" y="${h * 0.35}" fill="#f5f0e8" font-family="Impact, sans-serif" font-size="${fontSize}" font-weight="900" line-height="1.1">
        <tspan x="${w * 0.08}" dy="0">"${escapeXml(quote).substring(0, 30)}${quote.length > 30 ? '...' : ''}"</tspan>
      </text>
      <text x="${w * 0.08}" y="${h * 0.55}" fill="#d4a853" font-family="sans-serif" font-size="${fontSize * 0.4}" letter-spacing="6" font-weight="700">${escapeXml(author).toUpperCase()}</text>
      <rect x="${w * 0.08}" y="${h * 0.6}" width="${w * 0.3}" height="4" fill="#d4a853"/>
    </svg>`;
  },

  "bold-contrast": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.055;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <rect x="0" y="0" width="${w * 0.5}" height="100%" fill="#0c0c0e"/>
      <text x="${w * 0.25}" y="${h * 0.45}" text-anchor="middle" fill="#f5f0e8" font-family="Georgia, serif" font-size="${fontSize}" font-weight="600">
        <tspan x="${w * 0.25}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <text x="${w * 0.75}" y="${h * 0.45}" text-anchor="middle" fill="#0c0c0e" font-family="sans-serif" font-size="${fontSize * 0.5}" letter-spacing="3">— ${escapeXml(author)}</text>
    </svg>`;
  },

  "bold-neon": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.055;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#0a0a14"/>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <text x="${w / 2}" y="${h * 0.45}" text-anchor="middle" fill="#d4a853" font-family="Georgia, serif" font-size="${fontSize}" font-weight="600" filter="url(#glow)">
        <tspan x="${w / 2}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <text x="${w / 2}" y="${h * 0.62}" text-anchor="middle" fill="#f5f0e8" font-family="sans-serif" font-size="${fontSize * 0.45}" letter-spacing="3">— ${escapeXml(author)}</text>
    </svg>`;
  },

  "bold-brush": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.055;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#0c0c0e"/>
      <ellipse cx="${w * 0.5}" cy="${h * 0.48}" rx="${w * 0.4}" ry="${h * 0.15}" fill="#d4a853" opacity="0.15"/>
      <text x="${w / 2}" y="${h * 0.48}" text-anchor="middle" fill="#f5f0e8" font-family="Georgia, serif" font-size="${fontSize}" font-weight="600">
        <tspan x="${w / 2}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <text x="${w / 2}" y="${h * 0.65}" text-anchor="middle" fill="#d4a853" font-family="sans-serif" font-size="${fontSize * 0.45}" letter-spacing="3">— ${escapeXml(author)}</text>
    </svg>`;
  },

  // === ELEGANT ===
  "elegant-script": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.06;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#f8f5f0"/>
      <rect x="${w * 0.08}" y="${h * 0.08}" width="${w * 0.84}" height="${h * 0.84}" fill="none" stroke="#c9a96e" stroke-width="1" opacity="0.4"/>
      <text x="${w / 2}" y="${h * 0.42}" text-anchor="middle" fill="#2c2c2c" font-family="Georgia, serif" font-size="${fontSize}" font-style="italic" font-weight="400">
        <tspan x="${w / 2}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <line x1="${w * 0.42}" y1="${h * 0.55}" x2="${w * 0.58}" y2="${h * 0.55}" stroke="#c9a96e" stroke-width="1"/>
      <text x="${w / 2}" y="${h * 0.63}" text-anchor="middle" fill="#8a7a6a" font-family="serif" font-size="${fontSize * 0.45}" letter-spacing="4">${escapeXml(author).toUpperCase()}</text>
    </svg>`;
  },

  "elegant-gold": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.055;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#1a1814"/>
      <rect x="${w * 0.06}" y="${h * 0.06}" width="${w * 0.88}" height="${h * 0.88}" fill="none" stroke="#c9a96e" stroke-width="2" opacity="0.6"/>
      <rect x="${w * 0.08}" y="${h * 0.08}" width="${w * 0.84}" height="${h * 0.84}" fill="none" stroke="#c9a96e" stroke-width="0.5" opacity="0.3"/>
      <text x="${w / 2}" y="${h * 0.42}" text-anchor="middle" fill="#f5f0e8" font-family="Georgia, serif" font-size="${fontSize}" font-weight="500">
        <tspan x="${w / 2}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <text x="${w / 2}" y="${h * 0.58}" text-anchor="middle" fill="#c9a96e" font-family="serif" font-size="${fontSize * 0.5}" letter-spacing="3">— ${escapeXml(author)}</text>
    </svg>`;
  },

  "elegant-floral": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.055;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#f5f0e8"/>
      <circle cx="${w * 0.15}" cy="${h * 0.15}" r="30" fill="none" stroke="#c9a96e" stroke-width="1" opacity="0.3"/>
      <circle cx="${w * 0.85}" cy="${h * 0.85}" r="30" fill="none" stroke="#c9a96e" stroke-width="1" opacity="0.3"/>
      <text x="${w / 2}" y="${h * 0.45}" text-anchor="middle" fill="#2c2c2c" font-family="Georgia, serif" font-size="${fontSize}" font-weight="500">
        <tspan x="${w / 2}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <text x="${w / 2}" y="${h * 0.6}" text-anchor="middle" fill="#8a7a6a" font-family="serif" font-size="${fontSize * 0.45}" letter-spacing="3">— ${escapeXml(author)}</text>
    </svg>`;
  },

  "elegant-vintage": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.055;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#e8e0d4"/>
      <rect x="${w * 0.05}" y="${h * 0.05}" width="${w * 0.9}" height="${h * 0.9}" fill="none" stroke="#8a7a6a" stroke-width="1" stroke-dasharray="8 4" opacity="0.4"/>
      <text x="${w / 2}" y="${h * 0.25}" text-anchor="middle" fill="#8a7a6a" font-family="serif" font-size="${fontSize * 0.6}" letter-spacing="6">✦ EST ✦</text>
      <text x="${w / 2}" y="${h * 0.45}" text-anchor="middle" fill="#3a3028" font-family="Georgia, serif" font-size="${fontSize}" font-weight="500">
        <tspan x="${w / 2}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <text x="${w / 2}" y="${h * 0.62}" text-anchor="middle" fill="#8a7a6a" font-family="serif" font-size="${fontSize * 0.45}" letter-spacing="2">— ${escapeXml(author)}</text>
    </svg>`;
  },

  "elegant-ornament": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.055;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#f5f0e8"/>
      <text x="${w * 0.5}" y="${h * 0.18}" text-anchor="middle" fill="#c9a96e" font-family="serif" font-size="${fontSize * 0.8}">❧</text>
      <text x="${w / 2}" y="${h * 0.45}" text-anchor="middle" fill="#2c2c2c" font-family="Georgia, serif" font-size="${fontSize}" font-weight="500">
        <tspan x="${w / 2}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <text x="${w * 0.5}" y="${h * 0.62}" text-anchor="middle" fill="#c9a96e" font-family="serif" font-size="${fontSize * 0.8}">❧</text>
      <text x="${w / 2}" y="${h * 0.72}" text-anchor="middle" fill="#8a7a6a" font-family="serif" font-size="${fontSize * 0.45}" letter-spacing="3">— ${escapeXml(author)}</text>
    </svg>`;
  },

  // === NATURE ===
  "nature-leaf": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.055;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#1a2a1a"/>
      <circle cx="${w * 0.85}" cy="${h * 0.15}" r="${Math.min(w, h) * 0.2}" fill="#2a4a2a" opacity="0.5"/>
      <circle cx="${w * 0.15}" cy="${h * 0.85}" r="${Math.min(w, h) * 0.15}" fill="#2a4a2a" opacity="0.3"/>
      <text x="${w / 2}" y="${h * 0.45}" text-anchor="middle" fill="#f5f0e8" font-family="Georgia, serif" font-size="${fontSize}" font-weight="500">
        <tspan x="${w / 2}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <text x="${w / 2}" y="${h * 0.62}" text-anchor="middle" fill="#8ab88a" font-family="sans-serif" font-size="${fontSize * 0.45}" letter-spacing="3">— ${escapeXml(author)}</text>
    </svg>`;
  },

  "nature-sky": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.055;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="skygrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#1a2a4a"/>
          <stop offset="50%" style="stop-color:#2a3a5a"/>
          <stop offset="100%" style="stop-color:#3a4a6a"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#skygrad)"/>
      <circle cx="${w * 0.2}" cy="${h * 0.2}" r="40" fill="#d4a853" opacity="0.1"/>
      <text x="${w / 2}" y="${h * 0.45}" text-anchor="middle" fill="#f5f0e8" font-family="Georgia, serif" font-size="${fontSize}" font-weight="500">
        <tspan x="${w / 2}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <text x="${w / 2}" y="${h * 0.62}" text-anchor="middle" fill="#aabbdd" font-family="sans-serif" font-size="${fontSize * 0.45}" letter-spacing="3">— ${escapeXml(author)}</text>
    </svg>`;
  },

  "nature-ocean": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.055;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="ocean" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#0a1a2a"/>
          <stop offset="100%" style="stop-color:#1a3a5a"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#ocean)"/>
      <path d="M0 ${h * 0.75} Q${w * 0.25} ${h * 0.7} ${w * 0.5} ${h * 0.75} T${w} ${h * 0.75}" fill="none" stroke="#4a8aaa" stroke-width="2" opacity="0.3"/>
      <path d="M0 ${h * 0.82} Q${w * 0.25} ${h * 0.77} ${w * 0.5} ${h * 0.82} T${w} ${h * 0.82}" fill="none" stroke="#4a8aaa" stroke-width="1.5" opacity="0.2"/>
      <text x="${w / 2}" y="${h * 0.42}" text-anchor="middle" fill="#f5f0e8" font-family="Georgia, serif" font-size="${fontSize}" font-weight="500">
        <tspan x="${w / 2}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <text x="${w / 2}" y="${h * 0.58}" text-anchor="middle" fill="#6ab8d4" font-family="sans-serif" font-size="${fontSize * 0.45}" letter-spacing="3">— ${escapeXml(author)}</text>
    </svg>`;
  },

  "nature-stone": (input, w, h) => {
    const { quote, author } = input;
    const fontSize = Math.min(w, h) * 0.055;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#2a2a28"/>
      <rect x="${w * 0.1}" y="${h * 0.1}" width="${w * 0.8}" height="${h * 0.8}" fill="#3a3a38" rx="8"/>
      <text x="${w / 2}" y="${h * 0.45}" text-anchor="middle" fill="#e8e4dc" font-family="Georgia, serif" font-size="${fontSize}" font-weight="500">
        <tspan x="${w / 2}" dy="0">"${escapeXml(quote)}"</tspan>
      </text>
      <text x="${w / 2}" y="${h * 0.62}" text-anchor="middle" fill="#a09b94" font-family="sans-serif" font-size="${fontSize * 0.45}" letter-spacing="3">— ${escapeXml(author)}</text>
    </svg>`;
  },

  // Legacy templates (backward compat)
  minimal: (input, w, h) => TEMPLATES["minimal-dark"](input, w, h),
  modern: (input, w, h) => TEMPLATES["editorial-modern"](input, w, h),
  classic: (input, w, h) => TEMPLATES["elegant-script"](input, w, h),
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
  const templateFn = TEMPLATES[input.templateId] || TEMPLATES["minimal-dark"];
  const svg = templateFn(input, width, height);

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
 * Get list of all available templates
 */
export function getTemplates(): TemplateInfo[] {
  return TEMPLATE_REGISTRY;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): TemplateInfo[] {
  return TEMPLATE_REGISTRY.filter((t) => t.category.toLowerCase() === category.toLowerCase());
}
