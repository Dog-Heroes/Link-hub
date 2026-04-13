"use client";

import { useState } from "react";
import tabsConfig from "@/config/tabs.json";
import { TAB_REGISTRY } from "./TabRegistry";

interface TabConfig {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
  order: number;
  component: string;
  requires_env?: string;
}

// Next.js only inlines NEXT_PUBLIC_ env vars when accessed as static literals.
// Dynamic process.env[key] won't work in client components — build a lookup map.
const ENV_FLAGS: Record<string, string | undefined> = {
  NEXT_PUBLIC_ENABLE_SHOP_TAB: process.env.NEXT_PUBLIC_ENABLE_SHOP_TAB,
  NEXT_PUBLIC_ENABLE_QUIZ_TAB: process.env.NEXT_PUBLIC_ENABLE_QUIZ_TAB,
  NEXT_PUBLIC_ENABLE_STORE_LOCATOR: process.env.NEXT_PUBLIC_ENABLE_STORE_LOCATOR,
};

function getActiveTabs(): TabConfig[] {
  return (tabsConfig.tabs as TabConfig[])
    .filter((t) => t.enabled)
    .filter(
      (t) => !t.requires_env || ENV_FLAGS[t.requires_env] === "true"
    )
    .sort((a, b) => a.order - b.order);
}

export default function TabBar() {
  const activeTabs = getActiveTabs();
  const [activeId, setActiveId] = useState(tabsConfig.default_tab);

  const activeTab = activeTabs.find((t) => t.id === activeId);
  const ActiveComponent = activeTab
    ? TAB_REGISTRY[activeTab.component]
    : null;

  return (
    <>
      <nav
        className="sticky top-0 z-20 bg-white flex overflow-x-auto scrollbar-none shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
        role="tablist"
      >
        {activeTabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeId === tab.id}
            onClick={() => setActiveId(tab.id)}
            className={`
              flex-shrink-0 px-5 py-3.5
              text-[14px] font-bold uppercase tracking-wide
              border-b-[3px] transition-colors
              min-h-[44px]
              ${
                activeId === tab.id
                  ? "text-[#E1251B] border-[#E1251B]"
                  : "text-gray-300 border-transparent hover:text-gray-400"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="pb-8" role="tabpanel">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </>
  );
}
