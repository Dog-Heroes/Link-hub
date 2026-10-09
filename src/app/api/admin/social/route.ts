import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminBrand } from "@/lib/admin-brand";
import { checkRowBrand } from "@/lib/admin-brand-guard";

export const dynamic = "force-dynamic";

/** Brand-aware: only the social links for the admin's currently active brand. */
export async function GET() {
  const brand = await getAdminBrand();
  const rows = await db.execute({ sql: 'SELECT * FROM social_links WHERE brand = ? ORDER BY "order"', args: [brand] });
  return NextResponse.json(rows.rows);
}

/** The row's brand is the admin's currently active brand — never trusted from the client. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const brand = await getAdminBrand();
  const { id, platform, url, order } = await req.json();

  await db.execute({
    sql: 'INSERT INTO social_links (id, platform, url, "order", enabled, brand) VALUES (?, ?, ?, ?, 1, ?)',
    args: [id || crypto.randomUUID(), platform, url, order ?? 0, brand],
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, platform, url, order, enabled } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const brand = await getAdminBrand();
  const ownership = await checkRowBrand("social_links", id, brand);
  if (ownership === "missing") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ownership === "other-brand") return NextResponse.json({ error: "Forbidden: social link belongs to another brand" }, { status: 403 });

  const updates: string[] = [];
  const args: (string | number)[] = [];

  if (platform !== undefined) { updates.push("platform = ?"); args.push(platform); }
  if (url !== undefined) { updates.push("url = ?"); args.push(url); }
  if (order !== undefined) { updates.push('"order" = ?'); args.push(order); }
  if (enabled !== undefined) { updates.push("enabled = ?"); args.push(enabled ? 1 : 0); }

  if (updates.length === 0) return NextResponse.json({ error: "No fields" }, { status: 400 });

  args.push(id);
  await db.execute({ sql: `UPDATE social_links SET ${updates.join(", ")} WHERE id = ?`, args });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const brand = await getAdminBrand();
  const ownership = await checkRowBrand("social_links", id, brand);
  if (ownership === "missing") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ownership === "other-brand") return NextResponse.json({ error: "Forbidden: social link belongs to another brand" }, { status: 403 });

  await db.execute({ sql: "DELETE FROM social_links WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
