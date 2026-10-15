import { NextResponse } from "next/server";
import { getShopCatalog } from "@/lib/shop-catalog";
import { SHOP_COLLECTION_URL } from "@/lib/shop";

// Niente prerender al build: il catalogo lo legge getShopCatalog() dal sito,
// con la sua cache in memoria di 10 minuti.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await getShopCatalog();
    return NextResponse.json(
      { products, collectionUrl: SHOP_COLLECTION_URL },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  } catch (error) {
    console.error("[products API] catalogo del sito non raggiungibile:", error);
    return NextResponse.json(
      { products: [], collectionUrl: SHOP_COLLECTION_URL, error: "unavailable" },
      { status: 502 }
    );
  }
}
