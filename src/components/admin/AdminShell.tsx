"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/auth-actions";
import BrandSwitch from "./BrandSwitch";
import { BRAND_LABEL, type Brand } from "@/lib/brand";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/links", label: "Link", icon: "🔗" },
  { href: "/admin/tabs", label: "Tab", icon: "📑" },
  { href: "/admin/social", label: "Social", icon: "💬" },
  { href: "/admin/quiz", label: "Quiz", icon: "🐕" },
  { href: "/admin/aspetto", label: "Aspetto", icon: "🎨" },
  { href: "/admin/settings", label: "Impostazioni", icon: "⚙️" },
];

interface AdminShellProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
  brand: Brand;
  children: React.ReactNode;
}

/**
 * Accent color driven by the active brand — not just the h1 text on each
 * page (AGENTS.md "Admin — switch brand" was already doing that) — so a
 * switch Dog↔Cat is visible everywhere in the shell at once: sidebar title,
 * active nav indicator, and the banner below. See ticket Marco 9 ott 2026
 * ("non è chiaro quale brand si sta modificando").
 */
const BRAND_ACCENT: Record<Brand, { text: string; bg: string; border: string; banner: string; bannerText: string }> = {
  dog: { text: "text-[#E1251B]", bg: "bg-[#E1251B]/5", border: "border-[#E1251B]", banner: "bg-[#E1251B]", bannerText: "text-white" },
  cat: { text: "text-[#8a7a00]", bg: "bg-[#F9EC64]/20", border: "border-[#F9EC64]", banner: "bg-[#F9EC64]", bannerText: "text-[#111111]" },
};

export default function AdminShell({ user, brand, children }: AdminShellProps) {
  const pathname = usePathname();
  const accent = BRAND_ACCENT[brand];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className={`text-lg font-bold ${accent.text}`}>{BRAND_LABEL[brand]}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Admin Panel</p>
        </div>

        <div className="px-4 py-3 border-b border-gray-200">
          <BrandSwitch active={brand} />
        </div>

        <nav className="flex-1 py-3">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors
                  ${
                    isActive
                      ? `${accent.bg} ${accent.text} font-semibold border-r-2 ${accent.border}`
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }
                `}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Active-brand banner — same accent color everywhere, so it's
            unmistakable which brand's content the current page affects,
            independently of each page's own h1 text. */}
        <div className={`${accent.banner} ${accent.bannerText} text-xs font-bold text-center py-1.5 tracking-wide uppercase`}>
          {brand === "cat" ? "🐱" : "🐶"} Stai modificando {BRAND_LABEL[brand]}
        </div>
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="text-xs text-gray-400 hover:text-red-500 mt-1"
      >
        Esci
      </button>
    </form>
  );
}
