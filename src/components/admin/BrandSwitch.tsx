"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BRANDS, BRAND_LABEL, type Brand } from "@/lib/brand";

/**
 * Switches which brand (Dog Heroes / Cat Heroes) every admin page filters
 * on — persisted server-side in a cookie (see /api/admin/brand) so every
 * server-rendered admin page picks it up after the refresh this triggers.
 * Content created while a brand is active (new tab/section/link/social row)
 * is tagged with that brand.
 *
 * Feedback loop (ticket Marco, 9 ott 2026 — "non sembra molto responsive"):
 * the clicked button highlights immediately (optimistic `current` state),
 * then shows a spinner for the whole round-trip (cookie POST + the
 * router.refresh() that re-runs every admin server component on the
 * current route with the new brand) instead of only covering the refresh —
 * the fetch await was previously outside useTransition, so `pending` never
 * reflected it and the UI looked frozen/unresponsive during that gap.
 */
export default function BrandSwitch({ active }: { active: Brand }) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [current, setCurrent] = useState(active);
  const [switching, setSwitching] = useState<Brand | null>(null);

  const pending = switching !== null || isRefreshing;

  async function switchTo(brand: Brand) {
    if (brand === current || pending) return;
    setCurrent(brand);
    setSwitching(brand);
    try {
      await fetch("/api/admin/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand }),
      });
    } finally {
      startTransition(() => {
        router.refresh();
      });
      // router.refresh() resolves once React has applied the new tree, so
      // this effectively clears right after — but in case refresh errors
      // out silently, don't leave the spinner stuck forever.
      setSwitching(null);
    }
  }

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1" role="tablist" aria-label="Brand attivo">
      {BRANDS.map((brand) => (
        <button
          key={brand}
          role="tab"
          aria-selected={current === brand}
          disabled={pending}
          onClick={() => switchTo(brand)}
          className={`
            flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors disabled:cursor-wait
            ${current === brand ? "bg-white text-[#E1251B] shadow-sm" : "text-gray-500 hover:text-gray-700"}
            ${pending && current !== brand ? "opacity-40" : ""}
          `}
        >
          {pending && current === brand ? <Spinner /> : <span>{brand === "cat" ? "🐱" : "🐶"}</span>}
          {BRAND_LABEL[brand]}
        </button>
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
