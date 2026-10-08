import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ADMIN_BRAND_COOKIE, isBrand } from "@/lib/brand";

/**
 * Persists the admin's active brand (Dog Heroes / Cat Heroes) in a cookie so
 * every server-rendered admin page — and the API routes it calls — can
 * filter by it. See src/lib/brand.ts.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { brand } = await req.json();
  if (!isBrand(brand)) return NextResponse.json({ error: "Invalid brand" }, { status: 400 });

  const res = NextResponse.json({ ok: true, brand });
  res.cookies.set(ADMIN_BRAND_COOKIE, brand, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
