import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { brandFromSearchParam, isBrand, sanitizeStyle, type BrandStyle } from "@/lib/brand";

export const dynamic = "force-dynamic";

/** BrandStyle field names — these go through sanitizeStyle; anything else is treated as free text. */
const STYLE_KEYS = new Set<string>([
  "colorPrimary",
  "colorAccent",
  "colorPageBg",
  "colorHeaderBg",
  "colorText",
  "colorHeaderText",
  "colorCardBg",
  "colorButtonText",
  "fontHeading",
  "fontBody",
  "radius",
  "logoUrl",
  "headerImageUrl",
]);

/** Non-style per-brand settings (used for "cat" — "dog" keeps the pre-existing global `settings` table). */
const TEXT_KEYS = new Set(["tagline", "meta_title", "meta_description"]);

/**
 * GET /api/admin/brand-settings?brand=cat — raw key/value map for that
 * brand's brand_settings rows (style_* keys + tagline/meta). No auth: mirrors
 * the pre-existing /api/admin/settings GET, which is also unauthenticated.
 */
export async function GET(req: NextRequest) {
  const brand = brandFromSearchParam(req.nextUrl.searchParams.get("brand"));
  const rows = await db.execute({
    sql: "SELECT key, value FROM brand_settings WHERE brand = ?",
    args: [brand],
  });
  const values: Record<string, string> = {};
  for (const row of rows.rows) values[String(row.key)] = String(row.value);
  return NextResponse.json({ brand, values });
}

/**
 * PUT /api/admin/brand-settings — body `{ brand, values: {...} }`. Style
 * fields are validated/clamped via sanitizeStyle (bad values are dropped,
 * never stored); text fields (tagline, meta_title, meta_description) are
 * stored as-is (trimmed to a sane length).
 */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!isBrand(body.brand)) return NextResponse.json({ error: "Invalid brand" }, { status: 400 });
  const brand = body.brand;

  const values = body.values && typeof body.values === "object" ? body.values : {};

  const styleInput: Record<string, unknown> = {};
  for (const key of Object.keys(values)) {
    if (STYLE_KEYS.has(key)) styleInput[key] = values[key];
  }
  const sanitizedStyle = sanitizeStyle(styleInput as Partial<Record<keyof BrandStyle, unknown>>);

  const writes: [string, string][] = Object.entries(sanitizedStyle).map(([k, v]) => [k, String(v)]);

  for (const key of Object.keys(values)) {
    if (TEXT_KEYS.has(key) && typeof values[key] === "string") {
      writes.push([key, values[key].slice(0, 500)]);
    }
  }

  for (const [key, value] of writes) {
    await db.execute({
      sql: "INSERT OR REPLACE INTO brand_settings (brand, key, value) VALUES (?, ?, ?)",
      args: [brand, key, value],
    });
  }

  return NextResponse.json({ ok: true, saved: writes.map(([k]) => k) });
}

/**
 * DELETE /api/admin/brand-settings — body `{ brand, scope: "style" }` resets
 * the brand's style to its hardcoded default by removing the saved style_*
 * rows (the "Ripristina predefinito" button in the admin — see
 * src/components/admin/AppearanceForm.tsx).
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!isBrand(body.brand)) return NextResponse.json({ error: "Invalid brand" }, { status: 400 });

  if (body.scope === "style") {
    const placeholders = Array.from(STYLE_KEYS).map(() => "?").join(", ");
    await db.execute({
      sql: `DELETE FROM brand_settings WHERE brand = ? AND key IN (${placeholders})`,
      args: [body.brand, ...Array.from(STYLE_KEYS)],
    });
  }

  return NextResponse.json({ ok: true });
}
