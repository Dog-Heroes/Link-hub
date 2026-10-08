"use client";

import { useState, useCallback } from "react";

interface Tab {
  id: string;
  label: string;
  icon: string;
  order: number;
  enabled: number;
  component_key: string;
}

async function api(body: object) {
  await fetch("/api/admin/tabs", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default function TabsManager({ initial }: { initial: Tab[] }) {
  const [tabs, setTabs] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);

  const toggle = useCallback(async (id: string, enabled: boolean) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, enabled: enabled ? 1 : 0 } : t)));
    await api({ id, enabled });
  }, []);

  const saveLabel = useCallback(async (id: string, label: string) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, label } : t)));
    setEditingId(null);
    await api({ id, label });
  }, []);

  /**
   * Swap a tab with its neighbour (by current `order`) and persist both new
   * `order` values via the existing PATCH /api/admin/tabs. Since the
   * existing orders are a clean consecutive sequence, swapping the two
   * values keeps the whole sequence clean and consecutive — no renumbering
   * of the other tabs is needed.
   */
  const move = useCallback(
    (id: string, direction: -1 | 1) => {
      const sorted = [...tabs].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((t) => t.id === id);
      const swapIdx = idx + direction;
      if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return;

      const a = sorted[idx];
      const b = sorted[swapIdx];
      const aOrder = b.order;
      const bOrder = a.order;

      setTabs((prev) =>
        prev.map((t) => {
          if (t.id === a.id) return { ...t, order: aOrder };
          if (t.id === b.id) return { ...t, order: bOrder };
          return t;
        })
      );

      api({ id: a.id, order: aOrder });
      api({ id: b.id, order: bOrder });
    },
    [tabs]
  );

  const sortedTabs = [...tabs].sort((a, b) => a.order - b.order);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="divide-y divide-gray-100">
        {sortedTabs.map((tab, index) => (
          <div key={tab.id} className="flex items-center px-5 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex flex-col mr-3">
              <button
                type="button"
                onClick={() => move(tab.id, -1)}
                disabled={index === 0}
                aria-label={`Sposta "${tab.label}" su`}
                className="text-gray-400 hover:text-[#E1251B] disabled:opacity-20 disabled:hover:text-gray-400 leading-none"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(tab.id, 1)}
                disabled={index === sortedTabs.length - 1}
                aria-label={`Sposta "${tab.label}" giù`}
                className="text-gray-400 hover:text-[#E1251B] disabled:opacity-20 disabled:hover:text-gray-400 leading-none"
              >
                ▼
              </button>
            </div>

            <span className="text-lg mr-3">
              {tab.icon === "link" ? "🔗" : tab.icon === "bag" ? "🛍️" : tab.icon === "sparkle" ? "✨" : tab.icon === "pin" ? "📍" : "📄"}
            </span>

            {editingId === tab.id ? (
              <LabelInput
                initial={tab.label}
                onSave={(label) => saveLabel(tab.id, label)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex-1 cursor-pointer" onClick={() => setEditingId(tab.id)}>
                <p className="text-sm font-semibold text-gray-800">{tab.label}</p>
                <p className="text-xs text-gray-400">{tab.component_key}</p>
              </div>
            )}

            <button
              onClick={() => toggle(tab.id, !tab.enabled)}
              className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${tab.enabled ? "bg-green-500" : "bg-gray-300"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${tab.enabled ? "left-[18px]" : "left-0.5"}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LabelInput({ initial, onSave, onCancel }: { initial: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="flex-1 flex gap-2 items-center">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onSave(value); if (e.key === "Escape") onCancel(); }}
        className="flex-1 text-sm font-semibold border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#E1251B]"
      />
      <button onClick={() => onSave(value)} className="text-xs font-bold text-[#E1251B]">Salva</button>
      <button onClick={onCancel} className="text-xs text-gray-400">Annulla</button>
    </div>
  );
}
