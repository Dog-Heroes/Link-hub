import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/analytics?days=7
 * Returns views, clicks, daily breakdown, and top links.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const days = Number(req.nextUrl.searchParams.get("days") || "7");

  try {
    // Current period
    const [viewsRes, clicksRes, dailyRes, topRes] = await Promise.all([
      db.execute({
        sql: `SELECT COUNT(*) as total FROM events
              WHERE event_type = 'view'
              AND created_at >= datetime('now', ?)`,
        args: [`-${days} days`],
      }),
      db.execute({
        sql: `SELECT COUNT(*) as total FROM events
              WHERE event_type = 'click'
              AND created_at >= datetime('now', ?)`,
        args: [`-${days} days`],
      }),
      db.execute({
        sql: `SELECT date(created_at) as day,
                     SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END) as views,
                     SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) as clicks
              FROM events
              WHERE created_at >= datetime('now', ?)
              GROUP BY date(created_at)
              ORDER BY day`,
        args: [`-${days} days`],
      }),
      db.execute({
        sql: `SELECT l.label, COUNT(e.id) as clicks
              FROM events e
              JOIN links l ON l.id = e.link_id
              WHERE e.event_type = 'click'
              AND e.created_at >= datetime('now', ?)
              GROUP BY e.link_id
              ORDER BY clicks DESC
              LIMIT 5`,
        args: [`-${days} days`],
      }),
    ]);

    // Previous period for % change
    const [prevViewsRes, prevClicksRes] = await Promise.all([
      db.execute({
        sql: `SELECT COUNT(*) as total FROM events
              WHERE event_type = 'view'
              AND created_at >= datetime('now', ?)
              AND created_at < datetime('now', ?)`,
        args: [`-${days * 2} days`, `-${days} days`],
      }),
      db.execute({
        sql: `SELECT COUNT(*) as total FROM events
              WHERE event_type = 'click'
              AND created_at >= datetime('now', ?)
              AND created_at < datetime('now', ?)`,
        args: [`-${days * 2} days`, `-${days} days`],
      }),
    ]);

    const totalViews = Number(viewsRes.rows[0]?.total ?? 0);
    const totalClicks = Number(clicksRes.rows[0]?.total ?? 0);
    const prevViews = Number(prevViewsRes.rows[0]?.total ?? 0);
    const prevClicks = Number(prevClicksRes.rows[0]?.total ?? 0);

    const viewsChange = prevViews > 0 ? Math.round(((totalViews - prevViews) / prevViews) * 100) : null;
    const clicksChange = prevClicks > 0 ? Math.round(((totalClicks - prevClicks) / prevClicks) * 100) : null;

    const dailyData = dailyRes.rows.map((r) => ({
      day: String(r.day),
      views: Number(r.views),
      clicks: Number(r.clicks),
    }));

    const topLinks = topRes.rows.map((r) => ({
      label: String(r.label),
      clicks: Number(r.clicks),
    }));

    return NextResponse.json({
      totalViews,
      totalClicks,
      viewsChange,
      clicksChange,
      dailyData,
      topLinks,
    });
  } catch {
    return NextResponse.json({
      totalViews: 0,
      totalClicks: 0,
      viewsChange: null,
      clicksChange: null,
      dailyData: [],
      topLinks: [],
    });
  }
}
