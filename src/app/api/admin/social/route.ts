import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const rows = await db.execute('SELECT * FROM social_links ORDER BY "order"');
  return NextResponse.json(rows.rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, platform, url, order } = await req.json();

  await db.execute({
    sql: 'INSERT INTO social_links (id, platform, url, "order", enabled) VALUES (?, ?, ?, ?, 1)',
    args: [id || crypto.randomUUID(), platform, url, order ?? 0],
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, platform, url, order, enabled } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

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

  await db.execute({ sql: "DELETE FROM social_links WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
