import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, tab_id, label, order, collapsed, type } = await req.json();

  await db.execute({
    sql: 'INSERT INTO sections (id, tab_id, label, "order", collapsed, type) VALUES (?, ?, ?, ?, ?, ?)',
    args: [id || crypto.randomUUID(), tab_id || "links", label, order ?? 0, collapsed ? 1 : 0, type || "links"],
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, label, order, collapsed } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

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

  await db.execute({ sql: "DELETE FROM sections WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
