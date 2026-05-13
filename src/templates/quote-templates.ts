export interface QuoteTemplateDefinition {
  id: string;
  name: string;
  category: "Minimal" | "Editorial" | "Bold" | "Elegant";
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
  mutedColor: string;
  layout: "centered" | "magazine" | "leftBold" | "elegantFrame";
}

/**
 * Canonical quote-card template registry.
 *
 * Designer maintenance location:
 *   /root/projects/meigen-ai/backend/src/templates/quote-templates.ts
 *
 * To add or replace templates later:
 *   1. Edit this QUOTE_TEMPLATES array.
 *   2. Keep `id` stable if existing saved cards should keep rendering the same way.
 *   3. Add new visual variants by choosing an existing `layout`, or ask dev to add a new layout renderer in src/lib/render.ts.
 *   4. Deploy backend first, then rebuild/deploy frontend so the gallery reflects the new list.
 */
export const QUOTE_TEMPLATES: QuoteTemplateDefinition[] = [
  {
    id: "minimal-dark",
    name: "Minimal Dark",
    category: "Minimal",
    description: "Clean dark card with refined gold accent.",
    previewQuote: "Simplicity is the ultimate sophistication.",
    previewAuthor: "Leonardo da Vinci",
    sizes: "1:1 · 4:5 · 9:16 · 16:9",
    background: { from: "#1a1a1c", to: "#0c0c0e" },
    textColor: "#f5f0e8",
    accentColor: "#d4a853",
    mutedColor: "#6b6560",
    layout: "centered",
  },
  {
    id: "editorial-warm",
    name: "Editorial Warm",
    category: "Editorial",
    description: "Warm editorial tone for thoughtful quotes.",
    previewQuote: "Act as if what you do makes a difference. It does.",
    previewAuthor: "William James",
    sizes: "All sizes",
    background: { from: "#2a1f1a", to: "#1a1510" },
    textColor: "#f5f0e8",
    accentColor: "#d4a853",
    mutedColor: "#8a7a6a",
    layout: "magazine",
  },
  {
    id: "bold-blue",
    name: "Bold Blue",
    category: "Bold",
    description: "High-contrast blue gradient for assertive posts.",
    previewQuote: "The best way to predict the future is to create it.",
    previewAuthor: "Peter Drucker",
    sizes: "All sizes",
    background: { from: "#1a1c2a", to: "#101520" },
    textColor: "#f5f0e8",
    accentColor: "#8aa4ff",
    mutedColor: "#8a90a8",
    layout: "leftBold",
  },
  {
    id: "elegant-green",
    name: "Elegant Green",
    category: "Elegant",
    description: "Deep green calm style with classic spacing.",
    previewQuote: "What we think, we become.",
    previewAuthor: "Buddha",
    sizes: "All sizes",
    background: { from: "#1a2a1c", to: "#101a12" },
    textColor: "#f5f0e8",
    accentColor: "#9fbc8f",
    mutedColor: "#7f9478",
    layout: "elegantFrame",
  },
  {
    id: "minimal-purple",
    name: "Minimal Purple",
    category: "Minimal",
    description: "Subtle purple background for creative quotes.",
    previewQuote: "Everything you can imagine is real.",
    previewAuthor: "Pablo Picasso",
    sizes: "All sizes",
    background: { from: "#2a1a2a", to: "#1a101a" },
    textColor: "#f5f0e8",
    accentColor: "#d4a853",
    mutedColor: "#8a728a",
    layout: "centered",
  },
  {
    id: "editorial-teal",
    name: "Editorial Teal",
    category: "Editorial",
    description: "Cool editorial card for productivity messages.",
    previewQuote: "Done is better than perfect.",
    previewAuthor: "Sheryl Sandberg",
    sizes: "All sizes",
    background: { from: "#1a2a2a", to: "#101a1a" },
    textColor: "#f5f0e8",
    accentColor: "#82c7bd",
    mutedColor: "#72928e",
    layout: "magazine",
  },
  {
    id: "bold-gold",
    name: "Bold Gold",
    category: "Bold",
    description: "Dark gold statement card for impact.",
    previewQuote: "Creativity is intelligence having fun.",
    previewAuthor: "Albert Einstein",
    sizes: "All sizes",
    background: { from: "#2a2a1a", to: "#1a1a10" },
    textColor: "#f5f0e8",
    accentColor: "#d4a853",
    mutedColor: "#9a8f64",
    layout: "leftBold",
  },
  {
    id: "elegant-black",
    name: "Elegant Black",
    category: "Elegant",
    description: "Classic black card with premium border.",
    previewQuote: "Be the change you wish to see.",
    previewAuthor: "Mahatma Gandhi",
    sizes: "All sizes",
    background: { from: "#1a1a1a", to: "#121212" },
    textColor: "#f5f0e8",
    accentColor: "#d4a853",
    mutedColor: "#6b6560",
    layout: "elegantFrame",
  },
];

export const DEFAULT_TEMPLATE_ID = "minimal-dark";
