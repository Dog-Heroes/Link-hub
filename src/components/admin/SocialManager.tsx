"use client";

import { useState, useCallback } from "react";

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  order: number;
  enabled: number;
}

const PLATFORMS = ["instagram", "tiktok", "youtube", "linkedin", "facebook", "whatsapp", "twitter"];

async function api(method: string, body: object) {
  await fetch("/api/admin/social", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default function SocialManager({ initial }: { initial: SocialLink[] }) {
  const [socials, setSocials] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const toggle = useCallback(async (id: string, enabled: boolean) => {
    setSocials((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: enabled ? 1 : 0 } : s)));
    await api("PATCH", { id, enabled });
  }, []);

  const saveUrl = useCallback(async (id: string, url: string) => {
    setSocials((prev) => prev.map((s) => (s.id === id ? { ...s, url } : s)));
    setEditingId(null);
    await api("PATCH", { id, url });
  }, []);

  const remove = useCallback(async (id: string) => {
    setSocials((prev) => prev.filter((s) => s.id !== id));
    await api("DELETE", { id });
  }, []);

  const add = useCallback(async (platform: string, url: string) => {
    const id = crypto.randomUUID();
    const order = socials.length;
    setSocials((prev) => [...prev, { id, platform, url, order, enabled: 1 }]);
    setAdding(false);
    await api("POST", { id, platform, url, order });
  }, [socials]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="divide-y divide-gray-100">
        {socials
          .sort((a, b) => a.order - b.order)
          .map((social) => (
            <div key={social.id} className="flex items-center px-5 py-3.5 hover:bg-gray-50 transition-colors">
              <span className="w-24 text-sm font-semibold text-gray-600 capitalize">{social.platform}</span>

              {editingId === social.id ? (
                <UrlInput
                  initial={social.url}
                  onSave={(url) => saveUrl(social.id, url)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <p
                  className="flex-1 text-sm text-gray-400 truncate cursor-pointer hover:text-gray-600"
                  onClick={() => setEditingId(social.id)}
                >
                  {social.url}
                </p>
              )}

              <button
                onClick={() => { if (confirm(`Rimuovere ${social.platform}?`)) remove(social.id); }}
                className="ml-3 text-gray-300 hover:text-red-500 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>

              <button
                onClick={() => toggle(social.id, !social.enabled)}
                className={`ml-3 relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${social.enabled ? "bg-green-500" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${social.enabled ? "left-[18px]" : "left-0.5"}`} />
              </button>
            </div>
          ))}
      </div>

      {adding ? (
        <AddSocialForm platforms={PLATFORMS} existing={socials.map((s) => s.platform)} onSave={add} onCancel={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)} className="w-full py-3 text-sm text-gray-400 hover:text-[#E1251B] hover:bg-gray-50 transition-colors border-t border-gray-100">
          + Aggiungi social
        </button>
      )}
    </div>
  );
}

function UrlInput({ initial, onSave, onCancel }: { initial: string; onSave: (url: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="flex-1 flex gap-2 items-center">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onSave(value); if (e.key === "Escape") onCancel(); }}
        className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#E1251B]"
      />
      <button onClick={() => onSave(value)} className="text-xs font-bold text-[#E1251B]">Salva</button>
      <button onClick={onCancel} className="text-xs text-gray-400">Annulla</button>
    </div>
  );
}

function AddSocialForm({ platforms, existing, onSave, onCancel }: { platforms: string[]; existing: string[]; onSave: (platform: string, url: string) => void; onCancel: () => void }) {
  const available = platforms.filter((p) => !existing.includes(p));
  const [platform, setPlatform] = useState(available[0] || "");
  const [url, setUrl] = useState("");

  if (available.length === 0) return <p className="px-5 py-3 text-sm text-gray-400">Tutti i social sono già aggiunti.</p>;

  return (
    <div className="flex gap-2 items-center px-5 py-3 bg-gray-50 border-t border-gray-200">
      <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 capitalize">
        {available.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#E1251B]"
      />
      <button onClick={() => { if (url.trim()) onSave(platform, url); }} className="text-xs font-bold text-white bg-[#E1251B] px-3 py-1.5 rounded-lg">Aggiungi</button>
      <button onClick={onCancel} className="text-xs text-gray-400">Annulla</button>
    </div>
  );
}
