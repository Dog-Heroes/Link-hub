import { NextResponse } from "next/server";
import { getProducts, type ShopifyProduct } from "@/lib/shopify";
import fallbackData from "@/config/products-fallback.json";

export const revalidate = 300; // ISR: 5 minutes

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json({ products, source: "shopify" });
  } catch (error) {
    console.error("[products API] Shopify fetch failed, serving fallback:", error);
    return NextResponse.json({
      products: fallbackData.products as ShopifyProduct[],
      source: "fallback",
    });
  }
}
