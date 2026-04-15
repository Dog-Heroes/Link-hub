import { NextResponse } from "next/server";
import storesData from "@/config/stores.json";

export const revalidate = 3600; // ISR: revalidate every hour

export async function GET() {
  return NextResponse.json(storesData);
}
