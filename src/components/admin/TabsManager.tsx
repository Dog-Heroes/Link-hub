"use client";

import { useState, useCallback } from "react";
import { tabTypesForBrand, type Brand } from "@/lib/brand";

interface Tab {
  id: string;
  label: string;
  icon: string;
  order: number;
  enabled: number;
  component_key: string;
}

async function api(method: string, body: object) {
  const res = await fetch("/api/admin/tabs", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Richiesta fallita (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

export default function TabsManager({ initial, brand = "dog" }: { initial: Tab[]; brand?: Brand }) {
  const [tabs, setTabs] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback(async (id: string, enabled: boolean) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, enabled: enabled ? 1 : 0 } : t)));
    await api("PATCH", { id, enabled }).catch((e) => setError(e.message));
  }, []);

  const saveLabel = useCallback(async (id: string, label: string) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, label } : t)));
    setEditingId(null);
    await api("PATCH", { id, label }).catch((e) => setError(e.message));
  }, []);

  const addTab = useCallback(
    async (component_key: string) => {
      setError(null);
      try {
        const result = await api("POST", { type: component_key });
        setTabs((prev) => [...prev, result.tab as Tab]);
        setAdding(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore nella creazione della tab");
      }
    },
    []
  );

  const deleteTab = useCallback(async (id: string) => {
    setTabs((prev) => prev.filter((t) => t.id !== id));
    await api("DELETE", { id }).catch((e) => setError(e.message));
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

      api("PATCH", { id: a.id, order: aOrder }).catch((e) => setError(e.message));
      api("PATCH", { id: b.id, order: bOrder }).catch((e) => setError(e.message));
    },
    [tabs]
  );

  const sortedTabs = [...tabs].sort((a, b) => a.order - b.order);
  const existingTypes = new Set(tabs.map((t) => t.component_key));
  const availableTypes = tabTypesForBrand(brand).filter((t) => !existingTypes.has(t.component_key));

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-3">✕</button>
        </div>
      )}

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
                onClick={() => {
                  if (confirm(`Eliminare la tab "${tab.label}" e tutte le sue sezioni/link?`)) deleteTab(tab.id);
                }}
                className="mr-3 text-gray-300 hover:text-red-500 transition-colors"
                title="Elimina tab"
              >
                <TrashIcon />
              </button>

              <button
                onClick={() => toggle(tab.id, !tab.enabled)}
                className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${tab.enabled ? "bg-green-500" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${tab.enabled ? "left-[18px]" : "left-0.5"}`} />
              </button>
            </div>
          ))}

          {sortedTabs.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              Nessuna tab per questo brand. Creane una qui sotto.
            </div>
          )}
        </div>
      </div>

      {availableTypes.length > 0 && (
        adding ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-4 flex flex-wrap gap-2">
            {availableTypes.map((t) => (
              <button
                key={t.component_key}
                onClick={() => addTab(t.component_key)}
                className="px-3.5 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:border-[#E1251B] hover:text-[#E1251B] transition-colors"
              >
                {t.icon === "link" ? "🔗" : t.icon === "bag" ? "🛍️" : t.icon === "sparkle" ? "✨" : "📍"} {t.label}
              </button>
            ))}
            <button onClick={() => setAdding(false)} className="px-3.5 py-2 text-sm text-gray-400 hover:text-gray-600">
              Annulla
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full py-4 rounded-xl border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-400 hover:text-[#E1251B] hover:border-[#E1251B]/30 transition-colors"
          >
            + Aggiungi tab
          </button>
        )
      )}
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

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}
