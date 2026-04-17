/**
 * POST /api/admin/stores/sync
 *
 * Reads all enabled stores from Turso and pushes store-locations.json
 * to the active Shopify theme via Admin API.
 *
 * Requires: SHOPIFY_ADMIN_TOKEN env var with write_themes scope.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rowToStore } from "@/app/api/admin/stores/route";
import { pushStoreLocationsToShopify } from "@/lib/shopify";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Load all enabled stores from DB
  const result = await db.execute(
    "SELECT * FROM stores WHERE enabled = 1 ORDER BY chain, name"
  );
  const stores = result.rows.map((r) =>
    rowToStore(r as Record<string, unknown>)
  );

  // 2. Push to Shopify
  try {
    const { themeId, key } = await pushStoreLocationsToShopify(stores);
    return NextResponse.json({
      ok: true,
      pushed: stores.length,
      themeId,
      key,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
