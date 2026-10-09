import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminBrand } from "@/lib/admin-brand";
import { tabTypesForBrand } from "@/lib/brand";
import { checkRowBrand } from "@/lib/admin-brand-guard";

export const dynamic = "force-dynamic";

/** Brand-aware: only the tabs for the admin's currently active brand (see src/lib/admin-brand.ts). */
export async function GET() {
  const brand = await getAdminBrand();
  const rows = await db.execute({ sql: 'SELECT * FROM tabs WHERE brand = ? ORDER BY "order"', args: [brand] });
  return NextResponse.json(rows.rows);
}

/**
 * Creates a new tab for the admin's currently active brand (never trusted
 * from the client — see src/lib/admin-brand.ts). `type` must be one of the
 * component keys the active brand's public page actually knows how to
 * render (src/lib/brand.ts tabTypesForBrand) — e.g. cat only gets
 * LinksTab/StoreLocatorTab, never QuizTab/ShopTab. At most one tab per
 * (brand, type): a second "Store" tab for the same brand makes no sense
 * (the public page picks the first enabled tab of a kind it finds), so a
 * duplicate request is rejected rather than silently creating a second row.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const brand = await getAdminBrand();
  const { type } = await req.json();

  const option = tabTypesForBrand(brand).find((t) => t.component_key === type);
  if (!option) {
    return NextResponse.json({ error: "Invalid tab type for this brand" }, { status: 400 });
  }

  const existing = await db.execute({
    sql: "SELECT id FROM tabs WHERE brand = ? AND component_key = ?",
    args: [brand, option.component_key],
  });
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "A tab of this type already exists for this brand" }, { status: 409 });
  }

  const orderRow = await db.execute({ sql: "SELECT MAX(\"order\") as maxOrder FROM tabs WHERE brand = ?", args: [brand] });
  const nextOrder = Number(orderRow.rows[0]?.maxOrder ?? -1) + 1;

  await db.execute({
    sql: 'INSERT INTO tabs (id, label, icon, "order", enabled, component_key, brand) VALUES (?, ?, ?, ?, 1, ?, ?)',
    args: [option.id, option.label, option.icon, nextOrder, option.component_key, brand],
  });

  return NextResponse.json({ ok: true, tab: { id: option.id, label: option.label, icon: option.icon, order: nextOrder, enabled: 1, component_key: option.component_key } }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, label, order, enabled } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const brand = await getAdminBrand();
  const ownership = await checkRowBrand("tabs", id, brand);
  if (ownership === "missing") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ownership === "other-brand") return NextResponse.json({ error: "Forbidden: tab belongs to another brand" }, { status: 403 });

  const updates: string[] = [];
  const args: (string | number)[] = [];

  if (label !== undefined) { updates.push("label = ?"); args.push(label); }
  if (order !== undefined) { updates.push('"order" = ?'); args.push(order); }
  if (enabled !== undefined) { updates.push("enabled = ?"); args.push(enabled ? 1 : 0); }

  if (updates.length === 0) return NextResponse.json({ error: "No fields" }, { status: 400 });

  args.push(id);
  await db.execute({ sql: `UPDATE tabs SET ${updates.join(", ")} WHERE id = ?`, args });

  return NextResponse.json({ ok: true });
}

/**
 * Deletes a tab and everything under it (sections, links) for the admin's
 * active brand. Cascades manually rather than relying on the schema's
 * `ON DELETE CASCADE` (src/lib/db.ts): libSQL/SQLite only enforces foreign
 * keys when `PRAGMA foreign_keys = ON` has been set on the connection,
 * which this app never does — so letting the DB "cascade" here would
 * silently leave orphan sections/links behind instead.
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const brand = await getAdminBrand();
  const ownership = await checkRowBrand("tabs", id, brand);
  if (ownership === "missing") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ownership === "other-brand") return NextResponse.json({ error: "Forbidden: tab belongs to another brand" }, { status: 403 });

  await db.execute({
    sql: "DELETE FROM links WHERE section_id IN (SELECT id FROM sections WHERE tab_id = ?)",
    args: [id],
  });
  await db.execute({ sql: "DELETE FROM sections WHERE tab_id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM tabs WHERE id = ?", args: [id] });

  return NextResponse.json({ ok: true });
}
