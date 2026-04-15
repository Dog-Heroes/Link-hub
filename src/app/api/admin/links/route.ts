import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, enabled, label, url, order } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const updates: string[] = [];
  const args: (string | number)[] = [];

  if (enabled !== undefined) {
    updates.push("enabled = ?");
    args.push(enabled ? 1 : 0);
  }
  if (label !== undefined) {
    updates.push("label = ?");
    args.push(label);
  }
  if (url !== undefined) {
    updates.push("url = ?");
    args.push(url);
  }
  if (order !== undefined) {
    updates.push('"order" = ?');
    args.push(order);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  args.push(id);
  await db.execute({
    sql: `UPDATE links SET ${updates.join(", ")} WHERE id = ?`,
    args,
  });

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, section_id, label, url, icon, badge, order, link_type } = body;

  await db.execute({
    sql: 'INSERT INTO links (id, section_id, label, url, icon, badge, "order", enabled, link_type) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)',
    args: [
      id || crypto.randomUUID(),
      section_id,
      label,
      url || "",
      icon || "link",
      badge || null,
      order ?? 0,
      link_type || "link",
    ],
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await db.execute({ sql: "DELETE FROM links WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
