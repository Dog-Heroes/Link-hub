import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const rows = await db.execute('SELECT * FROM tabs ORDER BY "order"');
  return NextResponse.json(rows.rows);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, label, order, enabled } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

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
