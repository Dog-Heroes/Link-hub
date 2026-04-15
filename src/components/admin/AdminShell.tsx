"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/links", label: "Link", icon: "🔗" },
  { href: "/admin/tabs", label: "Tab", icon: "📑" },
  { href: "/admin/social", label: "Social", icon: "💬" },
  { href: "/admin/quiz", label: "Quiz", icon: "🐕" },
  { href: "/admin/settings", label: "Impostazioni", icon: "⚙️" },
];

interface AdminShellProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
  children: React.ReactNode;
}

export default function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-bold text-[#E1251B]">Dog Heroes</h1>
          <p className="text-xs text-gray-400 mt-0.5">Admin Panel</p>
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
                      ? "bg-[#E1251B]/5 text-[#E1251B] font-semibold border-r-2 border-[#E1251B]"
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
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="text-xs text-gray-400 hover:text-red-500 mt-1"
            >
              Esci
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
