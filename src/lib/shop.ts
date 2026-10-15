/**
 * Tipi e helper della tab Shop condivisi fra server (catalogo, vedi
 * shop-catalog.ts) e client (carrello, vedi cart-store.ts e ShopTab.tsx).
 * Niente import server-only qui: questo file finisce nel bundle client.
 */

export const SITE_ORIGIN = "https://www.dogheroes.it";

/** Collezione del sito da cui la tab Shop prende prodotti e ordine. */
export const SHOP_COLLECTION = "tutti-i-prodotti-cane";
export const SHOP_COLLECTION_URL = `${SITE_ORIGIN}/collections/${SHOP_COLLECTION}`;

/**
 * Soglia della spedizione gratuita in centesimi. Copia del valore del tema
 * (`dh_shipping_threshold` in snippets/dogheroes--cart-rewards-bar.liquid,
 * repo Dog-Heroes/dogheroes-theme): se cambia lì, va cambiata anche qui.
 * Serve solo per la barra informativa nel carrello: il costo vero lo
 * calcola il checkout di Shopify.
 */
export const FREE_SHIPPING_THRESHOLD_CENTS = 2999;

export type ShopCategory = "surgelato" | "dispensa" | "snack" | "accessori";

export const SHOP_CATEGORY_LABEL: Record<ShopCategory, string> = {
  surgelato: "Surgelato",
  dispensa: "Dispensa",
  snack: "Snack e integratori",
  accessori: "Accessori",
};

export interface ShopVariant {
  /** Id numerico della variante Shopify, quello che va nel link-carrello. */
  id: string;
  /** Etichetta corta per i chip (es. "12 × 320g", "6 confezioni"); "" se unica. */
  label: string;
  /** Prezzo in centesimi. */
  price: number;
  /** Numero di confezioni del multipack, se ricavabile dal nome variante. */
  packs: number | null;
}

export interface ShopProduct {
  /** Handle del prodotto mostrato (quello della collezione del sito). */
  handle: string;
  title: string;
  image: string | null;
  category: ShopCategory;
  /** Pagina prodotto sul sito. */
  url: string;
  /** Varianti acquistabili, dalla più economica. Mai vuoto. */
  variants: ShopVariant[];
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

/**
 * Link-carrello di Shopify (`/cart/<variante>:<qta>,<variante>:<qta>`): crea
 * il carrello con tutte le righe e porta dritto al checkout del sito.
 * Verificato su dogheroes.it con un multipack + un accessorio insieme.
 */
export function cartPermalink(lines: { variantId: string; quantity: number }[]): string {
  const items = lines
    .filter((l) => l.quantity > 0)
    .map((l) => `${l.variantId}:${l.quantity}`)
    .join(",");
  return `${SITE_ORIGIN}/cart/${items}`;
}
