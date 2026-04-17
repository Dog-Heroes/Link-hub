import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import storesData from "@/config/stores.json";

interface RawStore {
  id: string;
  name: string;
  type: string;
  chain: string;
  address: string;
  city: string;
  zip: string;
  region?: string;
  lat: number;
  lng: number;
  phone?: string;
  email?: string;
  website?: string;
  opening_hours?: Record<string, string>;
  tags?: string[];
  icon?: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Allow optional force param to skip count check
  let force = false;
  try {
    const body = await req.json().catch(() => ({}));
    force = Boolean(body.force);
  } catch {
    // no body
  }

  if (!force) {
    const countResult = await db.execute("SELECT COUNT(*) as c FROM stores");
    const existing = Number((countResult.rows[0] as Record<string, unknown>).c);
    if (existing > 0) {
      return NextResponse.json(
        { error: "Stores table already seeded. Pass { force: true } to overwrite." },
        { status: 409 }
      );
    }
  }

  let count = 0;
  for (const s of storesData as RawStore[]) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO stores
        (id, name, type, chain, address, city, zip, region, lat, lng, phone, email, website, opening_hours, tags, icon, enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
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
        JSON.stringify(s.opening_hours || {}),
        JSON.stringify(s.tags || []),
        s.icon || "",
      ],
    });
    count++;
  }

  return NextResponse.json({ seeded: count });
}
