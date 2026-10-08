/**
 * Multi-brand support — Dog Heroes (`/hub`) and Cat Heroes (`/cat`) are the
 * same service with brand-scoped content: own tabs/sections/links/social
 * links (via the `brand` column added to those tables, see `migrate()` in
 * `src/lib/db.ts`) and an editable appearance (`brand_settings` table).
 *
 * `/hub` (dog) keeps reading the pre-existing global `settings` table for
 * non-style settings (tagline, meta, Trustpilot…) exactly as before — see
 * AGENTS.md, "NON toccare la tabella settings esistente". Cat (and the style
 * of both brands) uses the new `brand_settings` table instead.
 */

export type Brand = "dog" | "cat";

export const BRANDS: Brand[] = ["dog", "cat"];
export const DEFAULT_BRAND: Brand = "dog";

export function isBrand(value: unknown): value is Brand {
  return value === "dog" || value === "cat";
}

/** Tab ids reserved for the Cat Heroes brand (links-cat / stores-cat). */
export const CAT_TAB_IDS = {
  links: "links-cat",
  stores: "stores-cat",
} as const;

export const DOG_TAB_IDS = {
  links: "links",
  stores: "stores",
} as const;

export function linksTabId(brand: Brand): string {
  return brand === "cat" ? CAT_TAB_IDS.links : DOG_TAB_IDS.links;
}

/**
 * Cookie name for the admin's active brand (dog/cat) — see
 * src/lib/admin-brand.ts (server-only: it imports next/headers, so it's
 * kept out of this module, which client components also import).
 */
export const ADMIN_BRAND_COOKIE = "admin_brand";

/** Reads the brand from a request's `?brand=` query param, falling back to `dog`. */
export function brandFromSearchParam(value: string | null): Brand {
  return isBrand(value) ? value : DEFAULT_BRAND;
}

/* ------------------------------------------------------------------ */
/*  Appearance ("Aspetto") — editable per-brand style                  */
/* ------------------------------------------------------------------ */

export interface BrandStyle {
  colorPrimary: string; // header background + primary accents
  colorAccent: string; // buttons, active states
  colorPageBg: string; // page background behind the card
  colorHeaderBg: string; // header section background
  colorText: string; // body text color (on light surfaces)
  colorHeaderText: string; // text/logo color on the header
  colorCardBg: string; // link/store card background
  colorButtonText: string; // text color on primary buttons
  fontHeading: string; // Google Fonts family name (or "Inter"/"Cardo")
  fontBody: string;
  radius: number; // px, card/button corner radius
  logoUrl: string; // header logo (public path or https URL)
  headerImageUrl: string; // optional header background image, "" = none
}

/**
 * Default style for "dog" is the look already live in production — no new
 * data needed for `/hub` to render pixel-identical to before this feature.
 */
export const DOG_DEFAULT_STYLE: BrandStyle = {
  colorPrimary: "#E1251B",
  colorAccent: "#E1251B",
  colorPageBg: "#e8e4de",
  colorHeaderBg: "#E1251B",
  colorText: "#002B49",
  colorHeaderText: "#FFFFFF",
  colorCardBg: "#FFFFFF",
  colorButtonText: "#FFFFFF",
  fontHeading: "GT Pressura",
  fontBody: "Inter",
  radius: 16,
  logoUrl: "/images/hub/logo-white.svg",
  headerImageUrl: "",
};

/**
 * Default style for "cat" — yellow confirmed in the theme
 * (assets/dogheroes--catheroes-blog.css: #F9EC64) with black as accent/text,
 * matching the provided Cat Heroes wordmark.
 */
export const CAT_DEFAULT_STYLE: BrandStyle = {
  colorPrimary: "#F9EC64",
  colorAccent: "#111111",
  colorPageBg: "#FBF6D9",
  colorHeaderBg: "#F9EC64",
  colorText: "#111111",
  colorHeaderText: "#111111",
  colorCardBg: "#FFFFFF",
  colorButtonText: "#F9EC64",
  fontHeading: "Inter",
  fontBody: "Inter",
  radius: 16,
  logoUrl: "/catheroes-logo.webp",
  headerImageUrl: "",
};

export function defaultStyleFor(brand: Brand): BrandStyle {
  return brand === "cat" ? CAT_DEFAULT_STYLE : DOG_DEFAULT_STYLE;
}

/**
 * Curated Google Fonts list for the "Aspetto" style editor, plus the two
 * fonts already used today (Inter, Cardo — loaded via `next/font/google` in
 * `src/app/layout.tsx`, so picking them never triggers an extra network
 * request). Anything not in this list is rejected by `sanitizeStyle`.
 */
export const CURATED_FONTS: { name: string; weights: string[]; builtIn?: boolean }[] = [
  { name: "Inter", weights: ["400", "500", "600", "700", "800", "900"], builtIn: true },
  { name: "Cardo", weights: ["400", "700"], builtIn: true },
  // Dog Heroes brand font, already loaded via @font-face in src/styles/hub.css
  // — the default heading font for "dog" (preserves the look of production).
  { name: "GT Pressura", weights: ["300", "400", "700"], builtIn: true },
  { name: "Poppins", weights: ["400", "500", "600", "700", "800"] },
  { name: "Nunito", weights: ["400", "600", "700", "800", "900"] },
  { name: "Baloo 2", weights: ["400", "600", "700", "800"] },
  { name: "Fredoka", weights: ["400", "500", "600", "700"] },
  { name: "Quicksand", weights: ["400", "500", "600", "700"] },
  { name: "Montserrat", weights: ["400", "500", "600", "700", "800"] },
  { name: "Raleway", weights: ["400", "500", "600", "700", "800"] },
  { name: "Work Sans", weights: ["400", "500", "600", "700", "800"] },
  { name: "Lato", weights: ["400", "700", "900"] },
  { name: "Merriweather", weights: ["400", "700"] },
  { name: "Playfair Display", weights: ["400", "600", "700"] },
];

export function isCuratedFont(name: string): boolean {
  return CURATED_FONTS.some((f) => f.name === name);
}

/** Builds the Google Fonts CSS2 stylesheet URL for a curated, non-built-in font. */
export function googleFontHref(name: string): string | null {
  const font = CURATED_FONTS.find((f) => f.name === name);
  if (!font || font.builtIn) return null;
  const family = encodeURIComponent(font.name).replace(/%20/g, "+");
  const wght = font.weights.join(";");
  return `https://fonts.googleapis.com/css2?family=${family}:wght@${wght}&display=swap`;
}

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isValidHex(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_RE.test(value);
}

/** A logo/header image URL must be an https:// URL or a local public asset path. */
function isValidAssetUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value === "") return true;
  if (value.startsWith("/")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates and clamps a partial style payload coming from the admin UI.
 * Unknown/invalid fields are dropped silently (never thrown): the caller
 * merges the result onto the existing style, so a bad field just keeps its
 * previous value instead of corrupting storage.
 */
export function sanitizeStyle(input: Partial<Record<keyof BrandStyle, unknown>>): Partial<BrandStyle> {
  const out: Partial<BrandStyle> = {};

  const colorFields: (keyof BrandStyle)[] = [
    "colorPrimary",
    "colorAccent",
    "colorPageBg",
    "colorHeaderBg",
    "colorText",
    "colorHeaderText",
    "colorCardBg",
    "colorButtonText",
  ];
  for (const field of colorFields) {
    const v = input[field];
    if (isValidHex(v)) (out as Record<string, unknown>)[field] = v;
  }

  if (typeof input.fontHeading === "string" && isCuratedFont(input.fontHeading)) {
    out.fontHeading = input.fontHeading;
  }
  if (typeof input.fontBody === "string" && isCuratedFont(input.fontBody)) {
    out.fontBody = input.fontBody;
  }

  if (typeof input.radius === "number" && Number.isFinite(input.radius)) {
    out.radius = Math.max(0, Math.min(32, Math.round(input.radius)));
  } else if (typeof input.radius === "string" && input.radius.trim() !== "" && !Number.isNaN(Number(input.radius))) {
    out.radius = Math.max(0, Math.min(32, Math.round(Number(input.radius))));
  }

  if (isValidAssetUrl(input.logoUrl)) out.logoUrl = input.logoUrl as string;
  if (isValidAssetUrl(input.headerImageUrl)) out.headerImageUrl = input.headerImageUrl as string;

  return out;
}

/** Converts a `#rgb`/`#rrggbb` hex color to an `rgba(r, g, b, alpha)` string. */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Builds the CSS custom properties for a style, to inject as an inline `style` attribute. */
export function styleToCSSVars(style: BrandStyle): Record<string, string> {
  return {
    "--brand-color-primary": style.colorPrimary,
    "--brand-color-accent": style.colorAccent,
    "--brand-color-page-bg": style.colorPageBg,
    "--brand-color-header-bg": style.colorHeaderBg,
    "--brand-color-text": style.colorText,
    "--brand-color-header-text": style.colorHeaderText,
    "--brand-color-card-bg": style.colorCardBg,
    "--brand-color-button-text": style.colorButtonText,
    "--brand-font-heading": `"${style.fontHeading}", var(--font-inter), system-ui, sans-serif`,
    "--brand-font-body": `"${style.fontBody}", var(--font-inter), system-ui, sans-serif`,
    "--brand-radius": `${style.radius}px`,
    "--brand-shadow-accent": hexToRgba(style.colorAccent, 0.3),
    // Overrides the global --font-brand (src/styles/hub.css) for this subtree
    // (tagline, tab bar labels) so the "Aspetto" heading font applies there too.
    "--font-brand": `"${style.fontHeading}", var(--font-inter), system-ui, sans-serif`,
  };
}

/** Simple contrast check (WCAG-ish relative luminance) used by the admin editor's low-contrast warning. */
export function contrastRatio(hex1: string, hex2: string): number {
  const lum = (hex: string) => {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
    const chan = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
  };
  try {
    const l1 = lum(hex1) + 0.05;
    const l2 = lum(hex2) + 0.05;
    return l1 > l2 ? l1 / l2 : l2 / l1;
  } catch {
    return 21; // can't compute -> don't warn
  }
}

export const BRAND_LABEL: Record<Brand, string> = {
  dog: "Dog Heroes",
  cat: "Cat Heroes",
};
