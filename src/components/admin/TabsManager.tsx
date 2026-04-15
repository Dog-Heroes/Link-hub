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

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="divide-y divide-gray-100">
        {tabs
          .sort((a, b) => a.order - b.order)
          .map((tab) => (
            <div key={tab.id} className="flex items-center px-5 py-4 hover:bg-gray-50 transition-colors">
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
