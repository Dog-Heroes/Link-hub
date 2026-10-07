import { NextResponse } from "next/server";
import { getStoreLocations } from "@/lib/store-locator";

export const revalidate = 3600; // ISR: revalidate every hour

export async function GET() {
  const stores = await getStoreLocations();
  return NextResponse.json(stores);
}
