import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.execute("SELECT key, value FROM settings");
  const settings: Record<string, string> = {};
  for (const row of rows.rows) {
    settings[String(row.key)] = String(row.value);
  }
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: Record<string, string> = await req.json();

  for (const [key, value] of Object.entries(body)) {
    await db.execute({
      sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      args: [key, value],
    });
  }

  return NextResponse.json({ ok: true });
}
