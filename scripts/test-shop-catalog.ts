/**
 * Controlli sul catalogo della tab Shop (src/lib/shop-catalog.ts) e sul
 * link-carrello (src/lib/shop.ts). Script autonomo come gli altri test di
 * questa cartella (nessun test runner configurato), esce con codice != 0 se
 * qualcosa non torna:
 *
 *   npx tsx scripts/test-shop-catalog.ts          # solo controlli offline
 *   npx tsx scripts/test-shop-catalog.ts --live   # + catalogo vero da dogheroes.it
 */

import { buildCatalog, getShopCatalog, parseBundleMap, variantLabel } from "../src/lib/shop-catalog";
import { cartPermalink } from "../src/lib/shop";

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`✗ ${message}`);
  } else {
    console.log(`✓ ${message}`);
  }
}

// --- Etichette varianti ---------------------------------------------------
assert(variantLabel("320 / 12 Confezioni").label === "12 × 320g", "multipack surgelato → 12 × 320g");
assert(variantLabel("6 confezione").label === "6 confezioni", "plurale corretto per «6 confezione»");
assert(variantLabel("6 confezione").packs === 6, "numero confezioni ricavato");
assert(variantLabel("Default Title").label === "", "variante unica senza etichetta");
assert(variantLabel("Small").label === "Small", "titolo libero lasciato com'è");

// --- Mappa multipack del tema ----------------------------------------------
const html = `<script>
  window.DH_BUNDLE_MAP["beef-bowl-surgelato"] = { w: "multipack-beef", id: 1, min: 4499 };
  window.DH_BUNDLE_MAP["beef-bowl-dispensa"] = { w: "multipack-manzo", id: 2, min: 1199 };
</script>`;
const map = parseBundleMap(html);
assert(map.get("beef-bowl-surgelato") === "multipack-beef", "mappa base → multipack letta dall'HTML");

// --- Costruzione del catalogo ------------------------------------------------
const product = (handle: string, extra: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  handle,
  title: handle,
  product_type: "",
  tags: [] as string[],
  images: [{ src: `https://cdn.shopify.com/${handle}.jpg?v=1` }],
  variants: [{ id: 10, title: "Default Title", price: "4.99", available: true }],
  ...extra,
});

const collection = [
  product("beef-bowl-surgelato", { tags: ["frozen"], variants: [{ id: 11, title: "320g", price: "3.99", available: true }] }),
  product("beef-bowl-dispensa", { tags: ["pantry", "subscribable"] }),
  product("ffbb", { tags: ["frozen", "subscribable"] }),
  product("bandana", { product_type: "Gadget", tags: ["extra"] }),
  product("esaurito", { variants: [{ id: 99, title: "Default Title", price: "5.00", available: false }] }),
];
const all = [
  product("multipack-beef", {
    variants: [
      { id: 21, title: "320 / 24 Confezioni", price: "79.99", available: true },
      { id: 20, title: "320 / 12 Confezioni", price: "44.99", available: true },
      { id: 22, title: "650 / 24 Confezioni", price: "109.99", available: false },
    ],
  }),
  // multipack-manzo manca apposta: il prodotto base non va venduto da solo
];

const catalog = buildCatalog(collection, all, map);
const handles = catalog.map((p) => p.handle);
const beef = catalog.find((p) => p.handle === "beef-bowl-surgelato");
assert(beef?.variants.map((v) => v.id).join() === "20,21", "surgelato venduto con le varianti del multipack, disponibili, dalla più economica");
assert(beef?.variants[0].price === 4499, "prezzo in centesimi");
assert(beef?.category === "surgelato", "categoria dal tag frozen");
assert(!handles.includes("beef-bowl-dispensa"), "prodotto mappato a un multipack introvabile escluso");
assert(!handles.includes("ffbb"), "prodotto dei piani (subscribable senza multipack) escluso");
assert(!handles.includes("esaurito"), "prodotto senza varianti disponibili escluso");
assert(catalog.find((p) => p.handle === "bandana")?.category === "accessori", "gadget → accessori");
assert(beef?.image?.includes("width=480") === true, "immagine ridotta dal CDN");

// --- Link-carrello -----------------------------------------------------------
assert(
  cartPermalink([
    { variantId: "20", quantity: 2 },
    { variantId: "10", quantity: 1 },
    { variantId: "30", quantity: 0 },
  ]) === "https://www.dogheroes.it/cart/20:2,10:1",
  "link-carrello con più righe, righe a 0 ignorate"
);

async function live() {
  const products = await getShopCatalog();
  console.log(`\nCatalogo live: ${products.length} prodotti`);
  for (const p of products) {
    console.log(`  [${p.category}] ${p.title} — ${p.variants.map((v) => `${v.label || "unica"} ${(v.price / 100).toFixed(2)}€`).join(", ")}`);
  }
  assert(products.length > 0, "catalogo live non vuoto");
  assert(!products.some((p) => /^ff[a-z]b$/.test(p.handle)), "nessun prodotto dei piani Paws nel catalogo live");
  const frozen = products.filter((p) => p.category === "surgelato");
  assert(frozen.every((p) => p.variants.every((v) => (v.packs ?? 0) >= 12 || v.packs === null)), "surgelato mai sotto le 12 confezioni");
}

(process.argv.includes("--live") ? live() : Promise.resolve())
  .catch((err) => {
    failures++;
    console.error("✗ catalogo live:", err);
  })
  .finally(() => {
    if (failures > 0) {
      console.error(`\n${failures} controlli falliti`);
      process.exit(1);
    }
    console.log("\nTutto ok");
  });
