"use client";

import { useEffect, useState } from "react";
import { useUTM } from "@/hooks/useUTM";
import { appendUTM } from "@/lib/utm";
import { trackEvent } from "@/lib/analytics";
import type { ShopifyProduct } from "@/lib/shopify";

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border-2 border-[#002B49]/8 overflow-hidden animate-pulse">
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
/*  Product Card                                                       */
/* ------------------------------------------------------------------ */

function ProductCard({
  product,
  utm,
}: {
  product: ShopifyProduct;
  utm: Record<string, string | undefined>;
}) {
  const href = appendUTM(product.checkoutUrl, utm);

  const formattedPrice = new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: product.currency || "EUR",
  }).format(parseFloat(product.price));

  function handleClick() {
    trackEvent("shop_product_click", {
      product_id: product.id,
      title: product.title,
      price: product.price,
      variant_id: product.variantId,
    });
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="
        bg-white rounded-2xl
        border-2 border-[#002B49]/8
        overflow-hidden
        active:scale-[0.97] hover:border-[#E1251B]/30 hover:shadow-md
        transition-all
        shadow-[0_2px_8px_rgba(0,0,0,0.04)]
        flex flex-col
      "
    >
      {/* Product image */}
      <div className="aspect-square bg-[#F9F6F1] flex items-center justify-center overflow-hidden">
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
      </div>

      {/* Product info */}
      <div className="px-3 py-3 flex flex-col gap-1.5 flex-1">
        <h3 className="text-[13px] font-bold text-[#002B49] leading-tight line-clamp-2">
          {product.title}
        </h3>

        <span className="text-[16px] font-extrabold text-[#E1251B]">
          {formattedPrice}
        </span>

        <div
          className="
            mt-auto pt-1.5
            w-full py-2.5 rounded-xl
            bg-[#E1251B] text-white
            text-[13px] font-bold text-center uppercase tracking-wide
            min-h-[44px] flex items-center justify-center
          "
        >
          Acquista
        </div>
      </div>
    </a>
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
      stroke="#002B49"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="opacity-20"
    >
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  ShopTab                                                            */
/* ------------------------------------------------------------------ */

export default function ShopTab() {
  const utm = useUTM();
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <div className="px-4 pt-5">
      {/* Section header */}
      <p className="text-[12px] font-extrabold uppercase tracking-[0.15em] text-[#002B49]/40 mb-3">
        I nostri prodotti
      </p>

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="text-center py-8">
          <p className="text-[14px] text-gray-400">
            Non siamo riusciti a caricare i prodotti.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-[14px] font-bold text-[#E1251B] min-h-[44px]"
          >
            Riprova
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && products.length === 0 && (
        <div className="text-center py-8">
          <p className="text-[14px] text-gray-400">
            Nessun prodotto disponibile al momento.
          </p>
        </div>
      )}

      {/* Product grid */}
      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} utm={utm} />
          ))}
        </div>
      )}
    </div>
  );
}
