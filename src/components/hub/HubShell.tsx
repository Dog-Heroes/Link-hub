import Image from "next/image";
import TabBar from "./TabBar";
import TrustpilotWidget from "./TrustpilotWidget";
import ViewTracker from "./ViewTracker";
import { db, ensureMigrated } from "@/lib/db";
import {
  type Brand,
  type BrandStyle,
  defaultStyleFor,
  sanitizeStyle,
  styleToCSSVars,
  googleFontHref,
  BRAND_LABEL,
  DOG_DEFAULT_STYLE,
} from "@/lib/brand";

/* ------------------------------------------------------------------ */
/*  Types shared with client components                                */
/* ------------------------------------------------------------------ */

export interface TabData {
  id: string;
  label: string;
  icon: string;
  order: number;
  component_key: string;
}

export interface SectionData {
  id: string;
  tab_id: string;
  label: string;
  order: number;
  collapsed: boolean;
}

export interface LinkData {
  id: string;
  section_id: string;
  label: string;
  url: string;
  icon: string;
  badge: string | null;
  order: number;
  link_type: string;
  media_url: string | null;
}

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, () => React.JSX.Element> = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  linkedin: LinkedInIcon,
  facebook: FacebookIcon,
};

/* ------------------------------------------------------------------ */
/*  Data fetching                                                      */
/* ------------------------------------------------------------------ */

const DOG_DEFAULT_TAGLINE = "L'azienda italiana del cibo fresco";
const CAT_DEFAULT_TAGLINE = "Il cibo fresco per gatti, firmato Dog Heroes";

const DOG_FALLBACK_SOCIAL = [
  { platform: "instagram", url: "https://instagram.com/dogheroes.it" },
  { platform: "tiktok", url: "https://tiktok.com/@dogheroes.it" },
  { platform: "youtube", url: "https://www.youtube.com/@dogheroes" },
  { platform: "linkedin", url: "https://www.linkedin.com/company/dog-heroes/" },
  { platform: "facebook", url: "https://www.facebook.com/dogheroes.it" },
];

/**
 * Merges saved brand_settings rows onto the brand's default style — unknown
 * or invalid fields (see sanitizeStyle) are ignored, so a bad/missing row
 * never corrupts the result: "dog" with no brand_settings rows renders
 * pixel-identical to the style that was hardcoded before this feature.
 */
function buildStyle(brand: Brand, brandSettings: Record<string, string>): BrandStyle {
  const base = defaultStyleFor(brand);
  const raw: Record<string, string> = {};
  for (const key of Object.keys(base) as (keyof BrandStyle)[]) {
    if (brandSettings[key] !== undefined) raw[key] = brandSettings[key];
  }
  const sanitized = sanitizeStyle(raw);
  return { ...base, ...sanitized };
}

type HubContent = {
  settings: Record<string, string>;
  tabs: TabData[];
  sections: SectionData[];
  links: LinkData[];
  socialLinks: { platform: string; url: string }[];
  tagline: string;
  style: BrandStyle;
};

function mapTabs(rows: Record<string, unknown>[]): TabData[] {
  return rows.map((r) => ({
    id: String(r.id),
    label: String(r.label),
    icon: String(r.icon),
    order: Number(r.order),
    component_key: String(r.component_key),
  }));
}

function mapSections(rows: Record<string, unknown>[]): SectionData[] {
  return rows.map((r) => ({
    id: String(r.id),
    tab_id: String(r.tab_id),
    label: String(r.label),
    order: Number(r.order),
    collapsed: Boolean(r.collapsed),
  }));
}

function mapLinks(rows: Record<string, unknown>[]): LinkData[] {
  return rows.map((r) => ({
    id: String(r.id),
    section_id: String(r.section_id),
    label: String(r.label),
    url: String(r.url),
    icon: String(r.icon),
    badge: r.badge ? String(r.badge) : null,
    order: Number(r.order),
    link_type: String(r.link_type),
    media_url: r.media_url ? String(r.media_url) : null,
  }));
}

/**
 * Brand-aware fetch (filters tabs/sections/links/social_links by `brand`,
 * reads brand_settings for style + non-dog tagline/meta). Throws if the
 * `brand` column/`brand_settings` table don't exist yet — see
 * getContent()'s fallback for what happens then.
 */
async function getBrandAwareContent(brand: Brand): Promise<HubContent> {
  const [settingsRows, brandSettingsRows, tabsRows, sectionsRows, linksRows, socialRows] =
    await Promise.all([
      db.execute("SELECT key, value FROM settings"),
      db.execute({ sql: "SELECT key, value FROM brand_settings WHERE brand = ?", args: [brand] }),
      db.execute({
        sql: 'SELECT * FROM tabs WHERE enabled = 1 AND brand = ? ORDER BY "order"',
        args: [brand],
      }),
      db.execute({ sql: 'SELECT * FROM sections WHERE brand = ? ORDER BY "order"', args: [brand] }),
      db.execute({
        sql: 'SELECT * FROM links WHERE enabled = 1 AND brand = ? ORDER BY "order"',
        args: [brand],
      }),
      db.execute({
        sql: 'SELECT platform, url FROM social_links WHERE enabled = 1 AND brand = ? ORDER BY "order"',
        args: [brand],
      }),
    ]);

  const settings: Record<string, string> = {};
  for (const row of settingsRows.rows) settings[String(row.key)] = String(row.value);

  const brandSettings: Record<string, string> = {};
  for (const row of brandSettingsRows.rows) brandSettings[String(row.key)] = String(row.value);

  const socialLinks = socialRows.rows.map((r) => ({
    platform: String(r.platform),
    url: String(r.url),
  }));

  // Non-style settings: "dog" keeps reading the pre-existing global
  // `settings` table exactly as before; "cat" (and any brand without a
  // dedicated global table) uses brand_settings instead.
  const tagline =
    brand === "dog"
      ? settings.tagline || DOG_DEFAULT_TAGLINE
      : brandSettings.tagline || CAT_DEFAULT_TAGLINE;

  return {
    settings,
    tabs: mapTabs(tabsRows.rows),
    sections: mapSections(sectionsRows.rows),
    links: mapLinks(linksRows.rows),
    socialLinks,
    tagline,
    style: buildStyle(brand, brandSettings),
  };
}

/**
 * Pre-brand-column fallback for "dog" only: the exact same queries this
 * file ran before the multi-brand feature (no `brand` filter at all, no
 * brand_settings). Used when getBrandAwareContent() fails because the
 * `brand` column/`brand_settings` table haven't been created yet on this
 * DB (migration hasn't run — see src/instrumentation.ts/ensureMigrated()) —
 * so /hub NEVER has to fall back to the hardcoded JS defaults just because
 * of migration timing: it keeps serving the real DB content.
 */
async function getLegacyDogContent(): Promise<HubContent> {
  const [settingsRows, tabsRows, sectionsRows, linksRows, socialRows] = await Promise.all([
    db.execute("SELECT key, value FROM settings"),
    db.execute('SELECT * FROM tabs WHERE enabled = 1 ORDER BY "order"'),
    db.execute('SELECT * FROM sections ORDER BY "order"'),
    db.execute('SELECT * FROM links WHERE enabled = 1 ORDER BY "order"'),
    db.execute('SELECT platform, url FROM social_links WHERE enabled = 1 ORDER BY "order"'),
  ]);

  const settings: Record<string, string> = {};
  for (const row of settingsRows.rows) settings[String(row.key)] = String(row.value);

  const socialLinks = socialRows.rows.map((r) => ({
    platform: String(r.platform),
    url: String(r.url),
  }));

  return {
    settings,
    tabs: mapTabs(tabsRows.rows),
    sections: mapSections(sectionsRows.rows),
    links: mapLinks(linksRows.rows),
    socialLinks,
    tagline: settings.tagline || DOG_DEFAULT_TAGLINE,
    style: DOG_DEFAULT_STYLE,
  };
}

async function getContent(brand: Brand): Promise<HubContent> {
  const hardcodedFallback: HubContent = {
    settings: {},
    tabs: [],
    sections: [],
    links: [],
    socialLinks: brand === "dog" ? DOG_FALLBACK_SOCIAL : [],
    tagline: brand === "dog" ? DOG_DEFAULT_TAGLINE : CAT_DEFAULT_TAGLINE,
    style: defaultStyleFor(brand),
  };

  // Defensive, non-blocking: the migration should already have run at
  // startup (src/instrumentation.ts). Memoized, so this is a cheap no-op
  // await after the first successful run; a failure here is swallowed —
  // the queries below have their own fallback regardless.
  await ensureMigrated().catch(() => {});

  try {
    return await getBrandAwareContent(brand);
  } catch (err) {
    if (brand === "dog") {
      console.error("[hub] brand-aware query failed, falling back to the pre-migration query:", err);
      try {
        return await getLegacyDogContent();
      } catch {
        return hardcodedFallback;
      }
    }
    return hardcodedFallback;
  }
}

export default async function HubShell({ brand = "dog" }: { brand?: Brand }) {
  const { settings, tabs, sections, links, socialLinks, tagline, style } = await getContent(brand);
  const cssVars = styleToCSSVars(style) as React.CSSProperties;
  const fontHref = googleFontHref(style.fontHeading) ?? googleFontHref(style.fontBody);
  const logoAlt = BRAND_LABEL[brand];
  // The pre-existing white SVG wordmark is sized for the red dog header;
  // the Cat Heroes default logo (a black wordmark on transparent/yellow) is
  // a plain raster image, so it's rendered with next/image's "auto" layout
  // instead of the fixed 220x110 box the dog logo was tuned for.
  const isDefaultDogLogo = style.logoUrl === "/images/hub/logo-white.svg";

  return (
    <div
      className="min-h-screen flex items-start justify-center"
      style={{ ...cssVars, background: "var(--brand-color-page-bg)" }}
    >
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      <ViewTracker brand={brand} />
      <div
        className="w-full max-w-[430px] min-h-screen relative overflow-x-hidden shadow-2xl"
        style={{ background: "var(--brand-color-header-bg)" }}
      >
        <header className="relative px-6 pt-10 pb-4 text-center">
          {/* Logo */}
          <div className={`relative mx-auto mb-4 ${isDefaultDogLogo ? "w-[220px]" : "w-[180px]"}`}>
            <Image
              src={style.logoUrl}
              alt={logoAlt}
              width={220}
              height={110}
              priority
              className="w-full h-auto"
            />
          </div>

          {/* Tagline — from DB (brand_settings for cat, settings for dog) */}
          <p
            className="relative text-[15px] leading-snug font-normal tracking-wide"
            style={{ fontFamily: "var(--font-brand)", color: "var(--brand-color-header-text)" }}
          >
            {tagline}
          </p>

          {/* Social icons — from DB, filtered by brand */}
          {socialLinks.length > 0 && (
            <div className="relative flex justify-center gap-5 mt-5">
              {socialLinks.map((social) => {
                const IconComponent = ICON_MAP[social.platform];
                if (!IconComponent) return null;
                return (
                  <SocialLink key={social.platform} href={social.url} label={social.platform}>
                    <IconComponent />
                  </SocialLink>
                );
              })}
            </div>
          )}

          {/* Trustpilot — Dog Heroes business unit only, not shown on /cat */}
          {brand === "dog" && (
            <div className="relative mt-4">
              <TrustpilotWidget />
            </div>
          )}
        </header>

        <TabBar tabs={tabs} sections={sections} links={links} settings={settings} brand={brand} />
      </div>
    </div>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex items-center justify-center hover:opacity-70 active:scale-95 transition-all"
      style={{ color: "var(--brand-color-header-text)" }}
    >
      {children}
    </a>
  );
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1.5" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.83a8.28 8.28 0 004.76 1.5v-3.4a4.85 4.85 0 01-1-.24z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 00.5 6.19 31.67 31.67 0 000 12a31.67 31.67 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.84.55 9.38.55 9.38.55s7.54 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.67 31.67 0 0024 12a31.67 31.67 0 00-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05a3.74 3.74 0 013.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77A1.75 1.75 0 000 1.73v20.54A1.75 1.75 0 001.77 24h20.45A1.75 1.75 0 0024 22.27V1.73A1.75 1.75 0 0022.22 0z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
    </svg>
  );
}
