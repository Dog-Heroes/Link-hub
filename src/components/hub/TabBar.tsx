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
        className="relative flex justify-center gap-2 overflow-x-auto scrollbar-none pt-2 pb-5 px-4"
        role="tablist"
        style={{ fontFamily: "var(--font-brand)" }}
      >
        {activeTabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeId === tab.id}
            onClick={() => setActiveId(tab.id)}
            className={`
              flex-shrink-0 px-5 py-2
              text-[15px] font-bold tracking-wide
              rounded-full transition-all
              min-h-[36px] border-[1.5px]
              ${
                activeId === tab.id
                  ? "bg-white text-[#E1251B] border-white"
                  : "bg-transparent text-white border-white/60 hover:border-white hover:bg-white/10"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="bg-white rounded-t-3xl min-h-[60vh] pb-8" role="tabpanel">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </>
  );
}
