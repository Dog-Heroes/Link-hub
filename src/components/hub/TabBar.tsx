"use client";

import { useState } from "react";
import { TAB_REGISTRY } from "./TabRegistry";
import type { TabData, SectionData, LinkData } from "./HubShell";

interface TabBarProps {
  tabs: TabData[];
  sections: SectionData[];
  links: LinkData[];
  settings: Record<string, string>;
}

export default function TabBar({ tabs, sections, links, settings }: TabBarProps) {
  const defaultTab = tabs[0]?.id ?? "links";
  const [activeId, setActiveId] = useState(defaultTab);

  const activeTab = tabs.find((t) => t.id === activeId);
  const ActiveComponent = activeTab
    ? TAB_REGISTRY[activeTab.component_key]
    : null;

  return (
    <>
      <nav
        className="relative flex justify-center gap-2 overflow-x-auto scrollbar-none pt-2 pb-5 px-4"
        role="tablist"
        style={{ fontFamily: "var(--font-brand)" }}
      >
        {tabs.map((tab) => (
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
        {ActiveComponent && (
          <ActiveComponent
            sections={sections.filter((s) => s.tab_id === activeTab?.id)}
            links={links}
            settings={settings}
          />
        )}
      </div>
    </>
  );
}
