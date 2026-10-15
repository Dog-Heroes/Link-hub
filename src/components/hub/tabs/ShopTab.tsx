"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUTM } from "@/hooks/useUTM";
import { appendUTM } from "@/lib/utm";
import { trackEvent } from "@/lib/analytics";
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHOP_CATEGORY_LABEL,
  SHOP_COLLECTION_URL,
  cartPermalink,
  formatPrice,
  type ShopCategory,
  type ShopProduct,
  type ShopVariant,
} from "@/lib/shop";
import {
  MAX_QUANTITY,
  addToCart,
  cartCount,
  cartTotal,
  clearCart,
  setQuantity,
  syncWithCatalog,
  useCart,
  type CartLine,
} from "@/lib/cart-store";

type CategoryFilter = ShopCategory | "tutti";

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border-2 border-[var(--brand-color-text)]/8 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="px-3 py-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-9 bg-gray-200 rounded-xl mt-2" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quantity stepper (card + carrello)                                 */
/* ------------------------------------------------------------------ */

function Stepper({
  quantity,
  onChange,
  label,
  compact = false,
}: {
  quantity: number;
  onChange: (qty: number) => void;
  label: string;
  compact?: boolean;
}) {
  const size = compact ? "w-9 h-9" : "w-11 h-11";
  return (
    <div
      className={`flex items-center justify-between rounded-xl border-2 border-[var(--brand-color-accent)] ${
        compact ? "" : "w-full"
      }`}
    >
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        aria-label={quantity === 1 ? `Togli ${label} dal carrello` : `Una in meno di ${label}`}
        className={`${size} flex items-center justify-center text-[20px] font-bold text-[var(--brand-color-accent)]`}
      >
        −
      </button>
      <span className="min-w-[2ch] text-center text-[15px] font-extrabold text-[var(--brand-color-text)]" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        disabled={quantity >= MAX_QUANTITY}
        aria-label={`Una in più di ${label}`}
        className={`${size} flex items-center justify-center text-[20px] font-bold text-[var(--brand-color-accent)] disabled:opacity-30`}
      >
        +
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Product Card                                                       */
/* ------------------------------------------------------------------ */

function ProductCard({
  product,
  cart,
  utm,
  brand,
}: {
  product: ShopProduct;
  cart: CartLine[];
  utm: Record<string, string | undefined>;
  brand: string;
}) {
  const [selectedId, setSelectedId] = useState(product.variants[0].id);
  const variant: ShopVariant =
    product.variants.find((v) => v.id === selectedId) ?? product.variants[0];
  const inCart = cart.find((l) => l.variantId === variant.id)?.quantity ?? 0;
  const itemLabel = variant.label ? `${product.title} (${variant.label})` : product.title;

  function handleAdd() {
    addToCart({
      variantId: variant.id,
      handle: product.handle,
      title: product.title,
      variantLabel: variant.label,
      image: product.image,
      price: variant.price,
    });
    trackEvent("shop_add_to_cart", { product: product.handle, variant_id: variant.id }, brand);
  }

  return (
    <div
      className="
        bg-white rounded-2xl
        border-2 border-[var(--brand-color-text)]/8
        overflow-hidden
        shadow-[0_2px_8px_rgba(0,0,0,0.04)]
        flex flex-col
      "
    >
      <a
        href={appendUTM(product.url, utm)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${product.title}: scheda prodotto sul sito`}
        className="aspect-square bg-[#F9F6F1] flex items-center justify-center overflow-hidden"
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <PlaceholderIcon />
        )}
      </a>

      <div className="px-3 py-3 flex flex-col gap-1.5 flex-1">
        <h3 className="text-[13px] font-bold text-[var(--brand-color-text)] leading-tight line-clamp-2">
          {product.title}
        </h3>

        <div>
          <span className="text-[16px] font-extrabold text-[var(--brand-color-accent)]">
            {formatPrice(variant.price)}
          </span>
          {variant.packs && variant.packs > 1 && (
            <span className="block text-[11px] text-[var(--brand-color-text)]/55">
              {formatPrice(Math.round(variant.price / variant.packs))} a confezione
            </span>
          )}
        </div>

        {product.variants.length > 1 && (
          <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label={`Formato di ${product.title}`}>
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={v.id === variant.id}
                onClick={() => setSelectedId(v.id)}
                className={`
                  px-1 py-1 min-h-[32px] rounded-lg border-[1.5px]
                  text-[11px] font-bold leading-tight text-center transition-colors
                  ${
                    v.id === variant.id
                      ? "border-[var(--brand-color-accent)] bg-[var(--brand-color-accent)]/8 text-[var(--brand-color-accent)]"
                      : "border-[var(--brand-color-text)]/15 text-[var(--brand-color-text)]/70"
                  }
                `}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto pt-1.5">
          {inCart > 0 ? (
            <Stepper
              quantity={inCart}
              label={itemLabel}
              onChange={(qty) => setQuantity(variant.id, qty)}
            />
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              className="
                w-full py-2.5 rounded-xl
                bg-[var(--brand-color-accent)] text-[var(--brand-color-button-text)]
                text-[13px] font-bold text-center uppercase tracking-wide
                min-h-[44px] active:scale-[0.97] transition-transform
              "
            >
              Aggiungi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Placeholder icon for products without images                       */
/* ------------------------------------------------------------------ */

function PlaceholderIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="opacity-20 text-[var(--brand-color-text)]"
      aria-hidden="true"
    >
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Barra del carrello (fissa in basso)                                */
/* ------------------------------------------------------------------ */

function CartBar({ cart, onOpen }: { cart: CartLine[]; onOpen: () => void }) {
  const count = cartCount(cart);
  return (
    <motion.div
      initial={{ y: 96 }}
      animate={{ y: 0 }}
      exit={{ y: 96 }}
      transition={{ type: "spring", damping: 26, stiffness: 300 }}
      className="fixed bottom-0 inset-x-0 mx-auto w-full max-w-[430px] z-30 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 pointer-events-none"
    >
      <button
        type="button"
        onClick={onOpen}
        className="
          pointer-events-auto w-full min-h-[56px] px-5
          flex items-center justify-between gap-3
          rounded-2xl bg-[var(--brand-color-text)] text-white
          shadow-[0_8px_24px_rgba(0,0,0,0.25)]
        "
      >
        <span className="flex items-center gap-3">
          <motion.span
            key={count}
            initial={{ scale: 1.35 }}
            animate={{ scale: 1 }}
            className="min-w-[28px] h-7 px-2 rounded-full bg-[var(--brand-color-accent)] text-[14px] font-extrabold flex items-center justify-center"
          >
            {count}
          </motion.span>
          <span className="text-[14px] font-bold">Vedi carrello</span>
        </span>
        <span className="text-[16px] font-extrabold">{formatPrice(cartTotal(cart))}</span>
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Carrello (pannello dal basso)                                      */
/* ------------------------------------------------------------------ */

function FreeShippingProgress({ total }: { total: number }) {
  const remaining = FREE_SHIPPING_THRESHOLD_CENTS - total;
  const progress = Math.min(100, (total / FREE_SHIPPING_THRESHOLD_CENTS) * 100);
  return (
    <div className="rounded-xl bg-[#F9F6F1] px-4 py-3" aria-live="polite">
      <p className="text-[13px] text-[var(--brand-color-text)]">
        {remaining > 0 ? (
          <>
            Ti mancano <strong>{formatPrice(remaining)}</strong> per la <strong>spedizione gratuita</strong>
          </>
        ) : (
          <>
            <strong>Spedizione gratuita</strong> sbloccata!
          </>
        )}
      </p>
      <div className="mt-2 h-2 rounded-full bg-[var(--brand-color-text)]/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--brand-color-accent)] transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function CartSheet({
  cart,
  onClose,
  utm,
  brand,
}: {
  cart: CartLine[];
  onClose: () => void;
  utm: Record<string, string | undefined>;
  brand: string;
}) {
  const total = cartTotal(cart);
  const checkoutUrl = appendUTM(cartPermalink(cart), utm);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Svuotato dall'interno del pannello: non resta un pannello vuoto aperto.
  useEffect(() => {
    if (cart.length === 0) onClose();
  }, [cart.length, onClose]);

  function handleCheckout() {
    trackEvent(
      "shop_checkout",
      { items: String(cartCount(cart)), total: String(total) },
      brand
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <motion.div
        className="absolute inset-0 bg-black/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hub-cart-title"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full max-w-[430px] max-h-[88vh] flex flex-col bg-white rounded-t-[24px] shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 id="hub-cart-title" className="text-[18px] font-extrabold text-[var(--brand-color-text)]">
            Il tuo carrello
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi il carrello"
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full text-[var(--brand-color-text)] hover:bg-[var(--brand-color-text)]/5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
          <FreeShippingProgress total={total} />

          <ul className="divide-y divide-[var(--brand-color-text)]/8">
            {cart.map((line) => {
              const label = line.variantLabel ? `${line.title} (${line.variantLabel})` : line.title;
              return (
                <li key={line.variantId} className="flex gap-3 py-3">
                  <div className="w-16 h-16 flex-shrink-0 rounded-xl bg-[#F9F6F1] overflow-hidden">
                    {line.image && (
                      <img src={line.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold leading-tight text-[var(--brand-color-text)] line-clamp-2">
                      {line.title}
                    </p>
                    {line.variantLabel && (
                      <p className="text-[12px] text-[var(--brand-color-text)]/60">{line.variantLabel}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Stepper
                        compact
                        quantity={line.quantity}
                        label={label}
                        onChange={(qty) => setQuantity(line.variantId, qty)}
                      />
                      <span className="text-[14px] font-extrabold text-[var(--brand-color-text)]">
                        {formatPrice(line.price * line.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={clearCart}
            className="text-[13px] font-bold text-[var(--brand-color-text)]/50 underline min-h-[44px]"
          >
            Svuota carrello
          </button>
        </div>

        <div className="border-t border-[var(--brand-color-text)]/10 px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))]">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[14px] font-bold text-[var(--brand-color-text)]">Totale</span>
            <span className="text-[20px] font-extrabold text-[var(--brand-color-text)]">{formatPrice(total)}</span>
          </div>
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleCheckout}
            className="
              w-full min-h-[52px] rounded-xl
              bg-[var(--brand-color-accent)] text-[var(--brand-color-button-text)]
              text-[15px] font-bold uppercase tracking-wide
              flex items-center justify-center
              active:scale-[0.98] transition-transform
            "
          >
            Vai al checkout
          </a>
          <p className="mt-2 text-center text-[11px] text-[var(--brand-color-text)]/50">
            Paghi in sicurezza su dogheroes.it. Spedizione e sconti sono calcolati al checkout.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ShopTab                                                            */
/* ------------------------------------------------------------------ */

export default function ShopTab({ brand = "dog" }: { brand?: string }) {
  const utm = useUTM(brand);
  const cart = useCart();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>("tutti");
  const [cartOpen, setCartOpen] = useState(false);
  const closeCart = useCallback(() => setCartOpen(false), []);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const list: ShopProduct[] = data.products ?? [];
        setProducts(list);
        syncWithCatalog(list);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const categories = useMemo(() => {
    const present = new Set(products.map((p) => p.category));
    return (Object.keys(SHOP_CATEGORY_LABEL) as ShopCategory[]).filter((c) => present.has(c));
  }, [products]);

  const visible =
    category === "tutti" ? products : products.filter((p) => p.category === category);

  return (
    <div className={`px-4 pt-5 ${cart.length > 0 ? "pb-24" : ""}`}>
      <p className="text-[12px] font-extrabold uppercase tracking-[0.15em] text-[var(--brand-color-text)]/40 mb-3">
        Componi il tuo carrello
      </p>

      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 mb-4" role="tablist" aria-label="Categorie">
          {(["tutti", ...categories] as CategoryFilter[]).map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={`
                flex-shrink-0 px-4 min-h-[36px] rounded-full border-[1.5px]
                text-[13px] font-bold transition-colors
                ${
                  category === c
                    ? "bg-[var(--brand-color-text)] border-[var(--brand-color-text)] text-white"
                    : "border-[var(--brand-color-text)]/20 text-[var(--brand-color-text)]"
                }
              `}
            >
              {c === "tutti" ? "Tutti" : SHOP_CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!loading && (error || products.length === 0) && (
        <div className="text-center py-8">
          <p className="text-[14px] text-gray-500">
            {error
              ? "Non siamo riusciti a caricare i prodotti."
              : "Nessun prodotto disponibile al momento."}
          </p>
          <a
            href={appendUTM(SHOP_COLLECTION_URL, utm)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center min-h-[44px] text-[14px] font-bold text-[var(--brand-color-accent)]"
          >
            Vai allo shop sul sito
          </a>
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {visible.map((product) => (
            <ProductCard key={product.handle} product={product} cart={cart} utm={utm} brand={brand} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {cart.length > 0 && !cartOpen && <CartBar key="bar" cart={cart} onOpen={() => setCartOpen(true)} />}
      </AnimatePresence>
      <AnimatePresence>
        {cartOpen && (
          <CartSheet key="sheet" cart={cart} onClose={closeCart} utm={utm} brand={brand} />
        )}
      </AnimatePresence>
    </div>
  );
}
