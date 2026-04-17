import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Store } from "@/app/api/admin/stores/route";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stores: Store[] = await req.json();

  if (!Array.isArray(stores)) {
    return NextResponse.json({ error: "Expected an array of stores" }, { status: 400 });
  }

  let imported = 0;

  for (const s of stores) {
    if (!s.id || !s.name) continue;

    await db.execute({
      sql: `INSERT OR REPLACE INTO stores
        (id, name, type, chain, address, city, zip, region, lat, lng, phone, email, website, opening_hours, tags, icon, enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        s.id,
        s.name,
        s.type || "rivenditore",
        s.chain || "",
        s.address || "",
        s.city || "",
        s.zip || "",
        s.region || "",
        s.lat ?? 0,
        s.lng ?? 0,
        s.phone || "",
        s.email || "",
        s.website || "",
        typeof s.opening_hours === "string"
          ? s.opening_hours
          : JSON.stringify(s.opening_hours || {}),
        typeof s.tags === "string"
          ? s.tags
          : JSON.stringify(s.tags || []),
        s.icon || "",
        s.enabled ?? 1,
      ],
    });
    imported++;
  }

  return NextResponse.json({ imported });
}
