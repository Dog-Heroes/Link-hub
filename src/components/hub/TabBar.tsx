"use client";

import { useRef, useState } from "react";
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
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const activeTab = tabs.find((t) => t.id === activeId);
  const ActiveComponent = activeTab
    ? TAB_REGISTRY[activeTab.component_key]
    : null;

  // On narrow viewports the tab row can be a few pixels wider than the
  // screen (e.g. "Piano su Misura" is a long label) — overflow-x-auto is
  // the intentional fix for that, but it must stay left-anchored
  // (justify-start, not justify-center): centering a row that already
  // overflows pushes the FIRST tab off-screen to the left with no way to
  // scroll back to it (scrollLeft can't go negative). Scrolling the
  // selected tab fully into view on click/navigation covers the rest —
  // a tab can otherwise end up partially hidden past the right edge.
  function selectTab(tabId: string) {
    setActiveId(tabId);
    tabRefs.current[tabId]?.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
      block: "nearest",
    });
  }

  // Used by a CMS link pointing at an internal tab (url = "#<tabId>", see
  // LinksTab.tsx): only switches to a tab that actually exists and is
  // enabled, so a stale/mistyped id never blanks the page.
  function navigateToTab(tabId: string) {
    if (tabs.some((t) => t.id === tabId)) selectTab(tabId);
  }

  return (
    <>
      <nav
        className="relative flex justify-start gap-2 overflow-x-auto scrollbar-none pt-2 pb-5 px-4"
        role="tablist"
        style={{ fontFamily: "var(--font-brand)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el;
            }}
            role="tab"
            aria-selected={activeId === tab.id}
            onClick={() => selectTab(tab.id)}
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
            onNavigateTab={navigateToTab}
          />
        )}
      </div>
    </>
  );
}
