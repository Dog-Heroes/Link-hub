import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminBrand } from "@/lib/admin-brand";
import { checkRowBrand } from "@/lib/admin-brand-guard";

/**
 * The section's brand is the admin's currently active brand — never trusted
 * from the client (see src/lib/admin-brand.ts and AGENTS.md "Admin — switch
 * brand"): a client-sent `brand` field, if any, is ignored.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const brand = await getAdminBrand();
  const { id, tab_id, label, order, collapsed, type } = await req.json();

  // The target tab must itself belong to the active brand — otherwise a
  // section tagged "brand" but hanging off a tab_id of the OTHER brand would
  // be orphaned (never rendered: TabBar only shows sections whose tab_id
  // matches one of THAT brand's own tabs) and nothing would catch it later.
  const resolvedTabId = tab_id || "links";
  const tabOwnership = await checkRowBrand("tabs", resolvedTabId, brand);
  if (tabOwnership === "missing") return NextResponse.json({ error: "Tab not found" }, { status: 404 });
  if (tabOwnership === "other-brand") return NextResponse.json({ error: "Forbidden: tab belongs to another brand" }, { status: 403 });

  await db.execute({
    sql: 'INSERT INTO sections (id, tab_id, label, "order", collapsed, type, brand) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [
      id || crypto.randomUUID(),
      resolvedTabId,
      label,
      order ?? 0,
      collapsed ? 1 : 0,
      type || "links",
      brand,
    ],
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, label, order, collapsed } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const brand = await getAdminBrand();
  const ownership = await checkRowBrand("sections", id, brand);
  if (ownership === "missing") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ownership === "other-brand") return NextResponse.json({ error: "Forbidden: section belongs to another brand" }, { status: 403 });

  const updates: string[] = [];
  const args: (string | number)[] = [];

  if (label !== undefined) { updates.push("label = ?"); args.push(label); }
  if (order !== undefined) { updates.push('"order" = ?'); args.push(order); }
  if (collapsed !== undefined) { updates.push("collapsed = ?"); args.push(collapsed ? 1 : 0); }

  if (updates.length === 0) return NextResponse.json({ error: "No fields" }, { status: 400 });

  args.push(id);
  await db.execute({ sql: `UPDATE sections SET ${updates.join(", ")} WHERE id = ?`, args });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const brand = await getAdminBrand();
  const ownership = await checkRowBrand("sections", id, brand);
  if (ownership === "missing") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ownership === "other-brand") return NextResponse.json({ error: "Forbidden: section belongs to another brand" }, { status: 403 });

  // Manual cascade — see tabs route.ts DELETE for why (no PRAGMA foreign_keys).
  await db.execute({ sql: "DELETE FROM links WHERE section_id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM sections WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
