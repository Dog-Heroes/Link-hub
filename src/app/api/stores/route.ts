import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rowToStore } from "@/app/api/admin/stores/route";

export const revalidate = 3600; // ISR: revalidate every hour

export async function GET() {
  try {
    const result = await db.execute(
      "SELECT * FROM stores WHERE enabled = 1 ORDER BY chain, name"
    );

    if (result.rows.length === 0) {
      // DB empty — fall through to fallback
      throw new Error("empty");
    }

    const stores = result.rows.map((r) => rowToStore(r as Record<string, unknown>));
    return NextResponse.json(stores);
  } catch {
    // Fallback to static JSON if DB not initialised or empty
    const fallback = await import("@/config/stores.json");
    return NextResponse.json(fallback.default);
  }
}
