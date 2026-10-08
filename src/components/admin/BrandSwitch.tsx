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
 */
export default function BrandSwitch({ active }: { active: Brand }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState(active);

  async function switchTo(brand: Brand) {
    if (brand === current) return;
    setCurrent(brand);
    await fetch("/api/admin/brand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand }),
    });
    startTransition(() => router.refresh());
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
            px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors disabled:opacity-60
            ${current === brand ? "bg-white text-[#E1251B] shadow-sm" : "text-gray-500 hover:text-gray-700"}
          `}
        >
          {brand === "cat" ? "🐱" : "🐶"} {BRAND_LABEL[brand]}
        </button>
      ))}
    </div>
  );
}
