/**
 * Catalogo della tab Shop — letto dallo storefront PUBBLICO di dogheroes.it,
 * come lo store locator (vedi store-locator.ts): la fonte unica è il sito,
 * niente credenziali Shopify e niente copia dei prodotti in questo repo.
 *
 * Perché non basta mostrare i prodotti della collezione così come sono:
 * il cibo (surgelato, dispensa) sul sito NON si compra a confezione singola.
 * La pagina prodotto vende un "multipack" collegato col metafield
 * `custom.bundle_products` (es. Beef Bowl surgelato → Multipack 12/24
 * confezioni). Il tema espone questa mappa su ogni pagina come
 * `window.DH_BUNDLE_MAP["<handle base>"] = { w: "<handle multipack>", … }`
 * (snippets/dogheroes--cross-sell-bundle-map.liquid nel repo del tema):
 * qui la leggiamo dalla home e per quei prodotti offriamo le varianti del
 * multipack, esattamente come fa la pagina prodotto.
 *
 * I prodotti `subscribable` senza multipack (ffbb, ffcb… dei piani Paws) si
 * comprano solo in abbonamento dal Piano su Misura: non vanno nello shop.
 */

import {
  SITE_ORIGIN,
  SHOP_COLLECTION,
  type ShopCategory,
  type ShopProduct,
  type ShopVariant,
} from "./shop";

interface StorefrontVariant {
  id: number;
  title: string;
  price: string;
  available: boolean;
}

interface StorefrontProduct {
  id: number;
  handle: string;
  title: string;
  product_type: string;
  tags: string[];
  images: { src: string }[];
  variants: StorefrontVariant[];
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

const BUNDLE_MAP_ENTRY = /DH_BUNDLE_MAP\["([^"]+)"\]\s*=\s*\{\s*w:\s*"([^"]+)"/g;

let cache: { products: ShopProduct[]; expiresAt: number } | null = null;

async function fetchText(path: string): Promise<string> {
  const res = await fetch(`${SITE_ORIGIN}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.text();
}

async function fetchProducts(path: string): Promise<StorefrontProduct[]> {
  const json = JSON.parse(await fetchText(path));
  if (!Array.isArray(json?.products)) throw new Error(`${path}: formato inatteso`);
  return json.products;
}

/** handle base → handle multipack, dalla mappa che il tema stampa in pagina. */
export function parseBundleMap(html: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const match of html.matchAll(BUNDLE_MAP_ENTRY)) map.set(match[1], match[2]);
  return map;
}

/** Le card sono larghe ~200px: chiediamo al CDN di Shopify un'immagine ridotta. */
function thumbnail(src: string | undefined): string | null {
  if (!src) return null;
  try {
    const url = new URL(src.startsWith("//") ? `https:${src}` : src);
    url.searchParams.set("width", "480");
    return url.toString();
  } catch {
    return src;
  }
}

function categoryOf(product: StorefrontProduct): ShopCategory {
  const tags = product.tags.map((t) => t.toLowerCase());
  if (tags.includes("frozen")) return "surgelato";
  if (tags.includes("pantry")) return "dispensa";
  if (product.product_type.toLowerCase() === "gadget") return "accessori";
  return "snack";
}

/**
 * Etichetta corta per il chip della variante, a partire dal titolo Shopify:
 * "320 / 12 Confezioni" → "12 × 320g", "6 confezione" → "6 confezioni",
 * "Default Title" → "" (prodotto senza varianti), il resto invariato.
 */
export function variantLabel(title: string): { label: string; packs: number | null } {
  if (title === "Default Title") return { label: "", packs: null };
  const packsMatch = /(\d+)\s*confezion/i.exec(title);
  const packs = packsMatch ? Number(packsMatch[1]) : null;
  const grams = title
    .split("/")
    .map((part) => part.trim())
    .map((part) => /^(\d+)\s*g?$/i.exec(part)?.[1])
    .find(Boolean);

  if (packs && grams) return { label: `${packs} × ${grams}g`, packs };
  if (packs) return { label: `${packs} ${packs === 1 ? "confezione" : "confezioni"}`, packs };
  return { label: title, packs: null };
}

function toVariants(product: StorefrontProduct): ShopVariant[] {
  return product.variants
    .filter((v) => v.available)
    .map((v) => ({
      id: String(v.id),
      price: Math.round(parseFloat(v.price) * 100),
      ...variantLabel(v.title),
    }))
    .filter((v) => Number.isFinite(v.price) && v.price > 0)
    .sort((a, b) => a.price - b.price);
}

export function buildCatalog(
  collection: StorefrontProduct[],
  allProducts: StorefrontProduct[],
  bundleMap: Map<string, string>
): ShopProduct[] {
  const byHandle = new Map(allProducts.map((p) => [p.handle, p]));
  const seen = new Set<string>();
  const out: ShopProduct[] = [];

  for (const product of collection) {
    const wrapperHandle = bundleMap.get(product.handle);
    const wrapper = wrapperHandle ? byHandle.get(wrapperHandle) : undefined;

    // Mappato a un multipack che non troviamo: meglio non mostrarlo che
    // vendere la confezione singola, che sul sito non è acquistabile.
    if (wrapperHandle && !wrapper) continue;
    if (!wrapper && product.tags.includes("subscribable")) continue;

    const sellable = wrapper ?? product;
    if (seen.has(sellable.handle)) continue;

    const variants = toVariants(sellable);
    if (variants.length === 0) continue;
    seen.add(sellable.handle);

    out.push({
      handle: product.handle,
      title: product.title,
      image: thumbnail(product.images[0]?.src ?? sellable.images[0]?.src),
      category: categoryOf(product),
      url: `${SITE_ORIGIN}/products/${product.handle}`,
      variants,
    });
  }
  return out;
}

/**
 * Catalogo con cache in memoria di 10 minuti. Se il sito non risponde si
 * serve l'ultimo catalogo buono; senza nemmeno quello, l'errore sale al
 * chiamante (la tab mostra il link alla collezione sul sito).
 */
export async function getShopCatalog(): Promise<ShopProduct[]> {
  if (cache && Date.now() < cache.expiresAt) return cache.products;
  try {
    const [collection, allProducts, home] = await Promise.all([
      fetchProducts(`/collections/${SHOP_COLLECTION}/products.json?limit=250`),
      fetchProducts("/collections/all/products.json?limit=250"),
      fetchText("/"),
    ]);
    const products = buildCatalog(collection, allProducts, parseBundleMap(home));
    if (products.length === 0) throw new Error("catalogo vuoto");
    cache = { products, expiresAt: Date.now() + CACHE_TTL_MS };
    return products;
  } catch (err) {
    if (cache) {
      console.error("[shop] catalogo non aggiornato, servo l'ultimo valido:", err);
      return cache.products;
    }
    throw err;
  }
}
