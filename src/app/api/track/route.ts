import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/track — record a frontend event (view, click, etc.)
 * Body: { event_type, link_id?, referrer? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event_type = String(body.event_type || "click");
    const link_id = body.link_id ? String(body.link_id) : null;
    const referrer = body.referrer ? String(body.referrer) : null;
    const user_agent = req.headers.get("user-agent") || null;

    // Insert event
    await db.execute({
      sql: `INSERT INTO events (link_id, event_type, referrer, user_agent)
            VALUES (?, ?, ?, ?)`,
      args: [link_id, event_type, referrer, user_agent],
    });

    // Increment click_count on the link for backward compat
    if (event_type === "click" && link_id) {
      await db.execute({
        sql: `UPDATE links SET click_count = click_count + 1 WHERE id = ?`,
        args: [link_id],
      });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "tracking failed" }, { status: 500 });
  }
}
