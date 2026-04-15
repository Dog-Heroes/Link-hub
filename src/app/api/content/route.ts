import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Aggregated content endpoint — serves everything the frontend needs in one fetch.
 */
export async function GET() {
  try {
    const [settingsRows, tabsRows, sectionsRows, linksRows, socialRows] =
      await Promise.all([
        db.execute("SELECT key, value FROM settings"),
        db.execute('SELECT * FROM tabs WHERE enabled = 1 ORDER BY "order"'),
        db.execute('SELECT * FROM sections ORDER BY "order"'),
        db.execute('SELECT * FROM links WHERE enabled = 1 ORDER BY "order"'),
        db.execute('SELECT * FROM social_links WHERE enabled = 1 ORDER BY "order"'),
      ]);

    const settings: Record<string, string> = {};
    for (const row of settingsRows.rows) {
      settings[String(row.key)] = String(row.value);
    }

    return NextResponse.json({
      settings,
      tabs: tabsRows.rows,
      sections: sectionsRows.rows,
      links: linksRows.rows,
      social: socialRows.rows,
    });
  } catch {
    // DB not available — return empty state
    return NextResponse.json({
      settings: {},
      tabs: [],
      sections: [],
      links: [],
      social: [],
    });
  }
}
