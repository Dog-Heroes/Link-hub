"use client";

import { useState } from "react";

interface Section {
  id: string;
  label: string;
  order: number;
  collapsed: number;
}

interface LinkItem {
  id: string;
  section_id: string;
  label: string;
  url: string;
  icon: string;
  badge: string | null;
  order: number;
  enabled: number;
  link_type: string;
  click_count: number;
}

interface Props {
  initialSections: Section[];
  initialLinks: LinkItem[];
}

export default function LinksManager({ initialSections, initialLinks }: Props) {
  const [sections] = useState(initialSections);
  const [links, setLinks] = useState(initialLinks);

  async function toggleLink(id: string, enabled: boolean) {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, enabled: enabled ? 1 : 0 } : l))
    );
    await fetch("/api/admin/links", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    });
  }

  if (sections.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-400 text-sm">
          Nessun link trovato. Esegui il seed del database per importare i dati attuali.
        </p>
        <code className="block mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
          npx tsx scripts/seed.ts
        </code>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {sections.map((section) => {
        const sectionLinks = links
          .filter((l) => l.section_id === section.id)
          .sort((a, b) => a.order - b.order);

        return (
          <div
            key={section.id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                {section.label}
              </h3>
            </div>

            <div className="divide-y divide-gray-100">
              {sectionLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {link.label}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{link.url}</p>
                  </div>

                  {link.badge && (
                    <span className="mx-3 text-[10px] font-bold uppercase bg-[#E1251B] text-white px-2 py-0.5 rounded-full">
                      {link.badge}
                    </span>
                  )}

                  <span className="text-xs text-gray-400 mx-3 whitespace-nowrap">
                    {link.click_count} click
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleLink(link.id, !link.enabled)}
                    className={`
                      relative w-10 h-6 rounded-full transition-colors
                      ${link.enabled ? "bg-green-500" : "bg-gray-300"}
                    `}
                  >
                    <span
                      className={`
                        absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                        ${link.enabled ? "left-[18px]" : "left-0.5"}
                      `}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
