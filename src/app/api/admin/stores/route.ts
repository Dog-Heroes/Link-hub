import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export interface Store {
  id: string;
  name: string;
  type: string;
  chain: string;
  address: string;
  city: string;
  zip: string;
  region: string;
  lat: number;
  lng: number;
  phone: string;
  email: string;
  website: string;
  opening_hours: {
    mon: string;
    tue: string;
    wed: string;
    thu: string;
    fri: string;
    sat: string;
    sun: string;
  };
  tags: string[];
  icon: string;
  enabled: number;
}

export function rowToStore(r: Record<string, unknown>): Store {
  return {
    id: String(r.id),
    name: String(r.name),
    type: String(r.type),
    chain: String(r.chain),
    address: String(r.address),
    city: String(r.city),
    zip: String(r.zip),
    region: String(r.region ?? ""),
    lat: Number(r.lat),
    lng: Number(r.lng),
    phone: String(r.phone ?? ""),
    email: String(r.email ?? ""),
    website: String(r.website ?? ""),
    opening_hours: JSON.parse(String(r.opening_hours || "{}")),
    tags: JSON.parse(String(r.tags || "[]")),
    icon: String(r.icon ?? ""),
    enabled: Number(r.enabled),
  };
}

// GET — lista tutti gli store
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db.execute("SELECT * FROM stores ORDER BY chain, name");
  const stores = result.rows.map((r) => rowToStore(r as Record<string, unknown>));
  return NextResponse.json(stores);
}

// POST — crea nuovo store
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: Partial<Store> = await req.json();

  if (!body.name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  const id = body.id || crypto.randomUUID();

  await db.execute({
    sql: `INSERT INTO stores
      (id, name, type, chain, address, city, zip, region, lat, lng, phone, email, website, opening_hours, tags, icon, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      body.name,
      body.type || "rivenditore",
      body.chain || "",
      body.address || "",
      body.city || "",
      body.zip || "",
      body.region || "",
      body.lat ?? 0,
      body.lng ?? 0,
      body.phone || "",
      body.email || "",
      body.website || "",
      JSON.stringify(body.opening_hours || {}),
      JSON.stringify(body.tags || []),
      body.icon || "",
      body.enabled ?? 1,
    ],
  });

  return NextResponse.json({ ok: true, id }, { status: 201 });
}

// PATCH — aggiorna store
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: Partial<Store> & { id: string } = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const updates: string[] = [];
  const args: (string | number | null)[] = [];

  const fields: Array<keyof Omit<Store, "id" | "opening_hours" | "tags">> = [
    "name", "type", "chain", "address", "city", "zip", "region",
    "lat", "lng", "phone", "email", "website", "icon", "enabled",
  ];

  for (const field of fields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`);
      args.push(body[field] as string | number);
    }
  }

  if (body.opening_hours !== undefined) {
    updates.push("opening_hours = ?");
    args.push(JSON.stringify(body.opening_hours));
  }

  if (body.tags !== undefined) {
    updates.push("tags = ?");
    args.push(JSON.stringify(body.tags));
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  args.push(body.id);
  await db.execute({
    sql: `UPDATE stores SET ${updates.join(", ")} WHERE id = ?`,
    args,
  });

  return NextResponse.json({ ok: true });
}

// DELETE — elimina store
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await db.execute({ sql: "DELETE FROM stores WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
