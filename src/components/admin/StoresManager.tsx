"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import type { Store } from "@/app/api/admin/stores/route";

const CHAINS = ["", "Arcaplanet", "Conad Pet Store", "Giulius", "Isola dei Tesori", "Finiper"];
const ALL_TAGS = ["Surgelato", "Snack", "Dispensa"];
const DAYS: { key: keyof Store["opening_hours"]; label: string }[] = [
  { key: "mon", label: "Lunedì" },
  { key: "tue", label: "Martedì" },
  { key: "wed", label: "Mercoledì" },
  { key: "thu", label: "Giovedì" },
  { key: "fri", label: "Venerdì" },
  { key: "sat", label: "Sabato" },
  { key: "sun", label: "Domenica" },
];

const EMPTY_HOURS: Store["opening_hours"] = {
  mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "",
};

const EMPTY_STORE: Omit<Store, "id"> = {
  name: "",
  type: "rivenditore",
  chain: "",
  address: "",
  city: "",
  zip: "",
  region: "",
  lat: 0,
  lng: 0,
  phone: "",
  email: "",
  website: "",
  opening_hours: { ...EMPTY_HOURS },
  tags: [],
  icon: "",
  enabled: 1,
};

// ─── helpers ────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateId(store: Partial<Store>): string {
  const parts = [store.chain || "", store.city || "", store.address || ""]
    .filter(Boolean)
    .map(slugify);
  return parts.join("-") || crypto.randomUUID();
}

function storesToCsv(stores: Store[]): string {
  const header = [
    "id", "name", "type", "chain", "address", "city", "zip", "region",
    "lat", "lng", "phone", "email", "website", "icon", "enabled", "tags",
    "mon", "tue", "wed", "thu", "fri", "sat", "sun",
  ].join(",");

  const rows = stores.map((s) => {
    const oh = s.opening_hours || EMPTY_HOURS;
    const cols = [
      s.id, s.name, s.type, s.chain, s.address, s.city, s.zip, s.region,
      s.lat, s.lng, s.phone, s.email, s.website, s.icon, s.enabled,
      (s.tags || []).join("|"),
      oh.mon, oh.tue, oh.wed, oh.thu, oh.fri, oh.sat, oh.sun,
    ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`);
    return cols.join(",");
  });

  return [header, ...rows].join("\n");
}

function parseCsvToStores(csv: string): Partial<Store>[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

  return lines.slice(1).map((line) => {
    // Simple CSV parse — handles quoted fields
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === "," && !inQuotes) {
        values.push(current); current = "";
      } else {
        current += ch;
      }
    }
    values.push(current);

    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });

    return {
      id: obj.id || undefined,
      name: obj.name,
      type: obj.type || "rivenditore",
      chain: obj.chain || "",
      address: obj.address || "",
      city: obj.city || "",
      zip: obj.zip || "",
      region: obj.region || "",
      lat: parseFloat(obj.lat) || 0,
      lng: parseFloat(obj.lng) || 0,
      phone: obj.phone || "",
      email: obj.email || "",
      website: obj.website || "",
      icon: obj.icon || "",
      enabled: parseInt(obj.enabled ?? "1") || 1,
      tags: obj.tags ? obj.tags.split("|").filter(Boolean) : [],
      opening_hours: {
        mon: obj.mon || "",
        tue: obj.tue || "",
        wed: obj.wed || "",
        thu: obj.thu || "",
        fri: obj.fri || "",
        sat: obj.sat || "",
        sun: obj.sun || "",
      },
    };
  });
}

// ─── API calls ───────────────────────────────────────────────────────────────

async function apiPost(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPatch(body: unknown) {
  const res = await fetch("/api/admin/stores", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiDelete(id: string) {
  const res = await fetch("/api/admin/stores", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${value ? "bg-green-500" : "bg-gray-300"}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? "left-[18px]" : "left-0.5"}`}
      />
    </button>
  );
}

function Field({
  label, children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#E1251B]";

// ─── Store Form ──────────────────────────────────────────────────────────────

function StoreForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: Partial<Store>;
  onSave: (store: Partial<Store>) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<Store>>(() => ({
    ...EMPTY_STORE,
    ...initial,
    opening_hours: { ...EMPTY_HOURS, ...(initial.opening_hours || {}) },
    tags: [...(initial.tags || [])],
  }));

  function set<K extends keyof Store>(key: K, value: Store[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setHours(day: keyof Store["opening_hours"], value: string) {
    setForm((prev) => ({
      ...prev,
      opening_hours: { ...(prev.opening_hours || EMPTY_HOURS), [day]: value },
    }));
  }

  function toggleTag(tag: string) {
    setForm((prev) => {
      const tags = prev.tags || [];
      return {
        ...prev,
        tags: tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Row 1: name + chain + type */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <Field label="Nome *">
            <input
              required
              value={form.name || ""}
              onChange={(e) => set("name", e.target.value)}
              className={inputCls}
              placeholder="Nome negozio"
            />
          </Field>
        </div>
        <div>
          <Field label="Catena">
            <select
              value={form.chain || ""}
              onChange={(e) => set("chain", e.target.value)}
              className={inputCls}
            >
              {CHAINS.map((c) => (
                <option key={c} value={c}>{c || "(nessuna)"}</option>
              ))}
            </select>
          </Field>
        </div>
        <div>
          <Field label="Tipo">
            <select
              value={form.type || "rivenditore"}
              onChange={(e) => set("type", e.target.value)}
              className={inputCls}
            >
              <option value="rivenditore">Rivenditore</option>
              <option value="retail">Retail</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Row 2: address + city + zip + region */}
      <div className="grid grid-cols-4 gap-3">
        <div className="col-span-2">
          <Field label="Indirizzo">
            <input
              value={form.address || ""}
              onChange={(e) => set("address", e.target.value)}
              className={inputCls}
              placeholder="Via Roma, 1"
            />
          </Field>
        </div>
        <div>
          <Field label="Città">
            <input
              value={form.city || ""}
              onChange={(e) => set("city", e.target.value)}
              className={inputCls}
              placeholder="Milano"
            />
          </Field>
        </div>
        <div>
          <Field label="CAP">
            <input
              value={form.zip || ""}
              onChange={(e) => set("zip", e.target.value)}
              className={inputCls}
              placeholder="20100"
            />
          </Field>
        </div>
      </div>

      {/* Row 3: region + lat + lng + phone */}
      <div className="grid grid-cols-4 gap-3">
        <div>
          <Field label="Regione">
            <input
              value={form.region || ""}
              onChange={(e) => set("region", e.target.value)}
              className={inputCls}
              placeholder="Lombardia"
            />
          </Field>
        </div>
        <div>
          <Field label="Latitudine">
            <input
              type="number"
              step="any"
              value={form.lat ?? 0}
              onChange={(e) => set("lat", parseFloat(e.target.value) || 0)}
              className={inputCls}
            />
          </Field>
        </div>
        <div>
          <Field label="Longitudine">
            <input
              type="number"
              step="any"
              value={form.lng ?? 0}
              onChange={(e) => set("lng", parseFloat(e.target.value) || 0)}
              className={inputCls}
            />
          </Field>
        </div>
        <div>
          <Field label="Telefono">
            <input
              value={form.phone || ""}
              onChange={(e) => set("phone", e.target.value)}
              className={inputCls}
              placeholder="02 1234567"
            />
          </Field>
        </div>
      </div>

      {/* Row 4: email + website + icon */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Field label="Email">
            <input
              type="email"
              value={form.email || ""}
              onChange={(e) => set("email", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <div>
          <Field label="Sito web">
            <input
              value={form.website || ""}
              onChange={(e) => set("website", e.target.value)}
              className={inputCls}
              placeholder="https://..."
            />
          </Field>
        </div>
        <div>
          <Field label="Icon URL">
            <input
              value={form.icon || ""}
              onChange={(e) => set("icon", e.target.value)}
              className={inputCls}
              placeholder="https://..."
            />
          </Field>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-2">Tags prodotti</label>
        <div className="flex gap-4">
          {ALL_TAGS.map((tag) => (
            <label key={tag} className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={(form.tags || []).includes(tag)}
                onChange={() => toggleTag(tag)}
                className="rounded border-gray-300 text-[#E1251B] focus:ring-[#E1251B]"
              />
              {tag}
            </label>
          ))}
        </div>
      </div>

      {/* Opening hours */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-2">
          Orari (formato HH:MM-HH:MM o "closed")
        </label>
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs text-gray-400 mb-1">{label}</label>
              <input
                value={(form.opening_hours || EMPTY_HOURS)[key] || ""}
                onChange={(e) => setHours(key, e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#E1251B]"
                placeholder="09:00-19:00"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Enabled */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-gray-700">Attivo</label>
        <Toggle
          value={!!form.enabled}
          onChange={(v) => set("enabled", v ? 1 : 0)}
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 text-sm font-bold bg-[#E1251B] text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {saving ? "Salvataggio…" : "Salva"}
        </button>
      </div>
    </form>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-[#002B49]">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl font-bold">✕</button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function StoresManager({ initial }: { initial: Store[] }) {
  const [stores, setStores] = useState<Store[]>(initial);
  const [search, setSearch] = useState("");
  const [chainFilter, setChainFilter] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Store | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  // ── filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return stores.filter((s) => {
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.chain.toLowerCase().includes(q);
      const matchChain = !chainFilter || s.chain === chainFilter;
      return matchSearch && matchChain;
    });
  }, [stores, search, chainFilter]);

  // ── add ────────────────────────────────────────────────────────────────────
  const handleAdd = useCallback(
    async (form: Partial<Store>) => {
      setSaving(true);
      try {
        const id = form.id || generateId(form);
        await apiPost("/api/admin/stores", { ...form, id });
        const newStore: Store = {
          ...(EMPTY_STORE as Store),
          ...form,
          id,
          opening_hours: form.opening_hours || { ...EMPTY_HOURS },
          tags: form.tags || [],
        };
        setStores((prev) => [...prev, newStore].sort((a, b) =>
          (a.chain + a.name).localeCompare(b.chain + b.name)
        ));
        setModal(null);
        setStatus("Negozio aggiunto.");
      } catch (e) {
        setStatus(`Errore: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // ── edit ───────────────────────────────────────────────────────────────────
  const handleEdit = useCallback(
    async (form: Partial<Store>) => {
      if (!editing) return;
      setSaving(true);
      try {
        await apiPatch({ ...form, id: editing.id });
        setStores((prev) =>
          prev.map((s) =>
            s.id === editing.id
              ? {
                  ...s,
                  ...form,
                  opening_hours: form.opening_hours || s.opening_hours,
                  tags: form.tags || s.tags,
                }
              : s
          )
        );
        setModal(null);
        setEditing(null);
        setStatus("Modifiche salvate.");
      } catch (e) {
        setStatus(`Errore: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setSaving(false);
      }
    },
    [editing]
  );

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Eliminare questo negozio?")) return;
    try {
      await apiDelete(id);
      setStores((prev) => prev.filter((s) => s.id !== id));
      setModal(null);
      setEditing(null);
      setStatus("Negozio eliminato.");
    } catch (e) {
      setStatus(`Errore: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  // ── toggle enabled ─────────────────────────────────────────────────────────
  const handleToggle = useCallback(async (store: Store) => {
    const enabled = store.enabled ? 0 : 1;
    setStores((prev) =>
      prev.map((s) => (s.id === store.id ? { ...s, enabled } : s))
    );
    try {
      await apiPatch({ id: store.id, enabled });
    } catch {
      // revert on error
      setStores((prev) =>
        prev.map((s) => (s.id === store.id ? { ...s, enabled: store.enabled } : s))
      );
    }
  }, []);

  // ── export CSV ─────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const csv = storesToCsv(stores);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stores.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [stores]);

  // ── import CSV/JSON + auto-sync ────────────────────────────────────────────
  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();

      let data: Partial<Store>[];
      if (file.name.endsWith(".json")) {
        data = JSON.parse(text);
      } else {
        data = parseCsvToStores(text);
      }

      setSaving(true);
      setStatus(`Caricamento ${data.length} negozi in corso…`);
      try {
        // Step 1: import into DB
        const res = await apiPost("/api/admin/stores/import", data);
        setStatus(`Importati ${res.imported} negozi. Sincronizzazione Shopify in corso…`);

        // Step 2: reload list
        const fresh = await fetch("/api/admin/stores");
        if (fresh.ok) setStores(await fresh.json());

        // Step 3: auto-sync to Shopify
        const syncRes = await fetch("/api/admin/stores/sync", { method: "POST" });
        const syncData = await syncRes.json();
        if (!syncRes.ok) throw new Error(syncData.error || "Sync Shopify fallito");

        setStatus(`Fatto! ${res.imported} negozi nel database, ${syncData.pushed} pushati su Shopify.`);
      } catch (err) {
        setStatus(`Errore: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setSaving(false);
        if (importRef.current) importRef.current.value = "";
      }
    },
    []
  );

  // ── seed from JSON ─────────────────────────────────────────────────────────
  const handleSeed = useCallback(async () => {
    if (
      !confirm(
        "Importare i 536 negozi dal JSON statico nel database?\n\nSe i negozi esistono già verrà chiesta ulteriore conferma."
      )
    )
      return;

    setSaving(true);
    setStatus("Seed in corso…");
    try {
      const res = await fetch("/api/admin/stores/seed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (res.status === 409) {
        const force = confirm("Il database contiene già negozi. Sovrascrivere tutto?");
        if (!force) { setSaving(false); setStatus(null); return; }
        const res2 = await fetch("/api/admin/stores/seed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force: true }),
        });
        const data2 = await res2.json();
        setStatus(`Seed completato: ${data2.seeded} negozi.`);
      } else {
        const data = await res.json();
        setStatus(`Seed completato: ${data.seeded} negozi.`);
      }
      const fresh = await fetch("/api/admin/stores");
      if (fresh.ok) setStores(await fresh.json());
    } catch (err) {
      setStatus(`Errore seed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }, []);

  // ── sync to Shopify ────────────────────────────────────────────────────────
  const handleSyncShopify = useCallback(async () => {
    if (
      !confirm(
        `Pushare ${stores.filter((s) => s.enabled).length} negozi attivi su Shopify come store-locations.json?\n\nQuesta operazione sovrascrive il file nel tema attivo.`
      )
    )
      return;

    setSaving(true);
    setStatus("Sync in corso verso Shopify…");
    try {
      const res = await fetch("/api/admin/stores/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore sconosciuto");
      setStatus(`✅ Sync completato: ${data.pushed} negozi pushati su Shopify (theme ${data.themeId}).`);
    } catch (err) {
      setStatus(`❌ Errore sync: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }, [stores]);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per nome, città, catena…"
          className="flex-1 min-w-[200px] text-sm border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-[#E1251B]"
        />

        {/* Chain filter */}
        <select
          value={chainFilter}
          onChange={(e) => setChainFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#E1251B]"
        >
          <option value="">Tutte le catene</option>
          {CHAINS.filter(Boolean).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Actions */}
        <button
          onClick={() => { setModal("add"); setEditing(null); }}
          className="px-4 py-2 text-sm font-bold bg-[#E1251B] text-white rounded-lg hover:bg-red-700"
        >
          + Aggiungi negozio
        </button>

        <label
          className={`px-4 py-2 text-sm font-bold border-2 border-[#E1251B] rounded-lg text-[#E1251B] hover:bg-red-50 cursor-pointer flex items-center gap-2 ${saving ? "opacity-50 pointer-events-none" : ""}`}
          title="Carica un CSV con i dati negozi: aggiorna il database e sincronizza Shopify in automatico"
        >
          ⬆️ Carica CSV → aggiorna tutto
          <input
            ref={importRef}
            type="file"
            accept=".json,.csv"
            className="hidden"
            onChange={handleImportFile}
          />
        </label>

        <button
          onClick={handleExport}
          className="px-4 py-2 text-sm font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          title="Scarica il CSV attuale con tutti i negozi"
        >
          ⬇️ Scarica CSV
        </button>

        <button
          onClick={handleSyncShopify}
          disabled={saving}
          className="px-4 py-2 text-sm font-semibold border border-green-200 rounded-lg text-green-700 hover:bg-green-50 disabled:opacity-50"
          title="Pusha i dati attuali dal database a Shopify senza importare un nuovo file"
        >
          🔄 Sync → Shopify
        </button>

        <button
          onClick={handleSeed}
          disabled={saving}
          className="px-4 py-2 text-sm font-semibold border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-50 text-xs"
          title="Solo la prima volta: carica i 536 negozi dal JSON statico nel database"
        >
          Popola DB (prima volta)
        </button>
      </div>

      {/* Status message */}
      {status && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-800">
          {status}
          <button onClick={() => setStatus(null)} className="text-blue-400 hover:text-blue-600 ml-4">✕</button>
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-gray-400">
        {filtered.length} di {stores.length} negozi
      </p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Nome</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Catena</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Città</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Regione</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Tags</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Tel.</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-500 text-xs">Attivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400 text-sm">
                    Nessun negozio trovato
                  </td>
                </tr>
              )}
              {filtered.map((store) => (
                <tr
                  key={store.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => { setEditing(store); setModal("edit"); }}
                >
                  <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px] truncate">
                    {store.name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{store.chain || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{store.city}</td>
                  <td className="px-4 py-3 text-gray-500">{store.region || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(store.tags || []).map((t) => (
                        <span
                          key={t}
                          className="inline-block px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{store.phone || "—"}</td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <Toggle
                      value={!!store.enabled}
                      onChange={() => handleToggle(store)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add modal */}
      {modal === "add" && (
        <Modal title="Aggiungi negozio" onClose={() => setModal(null)}>
          <StoreForm
            initial={{}}
            onSave={handleAdd}
            onCancel={() => setModal(null)}
            saving={saving}
          />
        </Modal>
      )}

      {/* Edit modal */}
      {modal === "edit" && editing && (
        <Modal title={`Modifica: ${editing.name}`} onClose={() => { setModal(null); setEditing(null); }}>
          <StoreForm
            initial={editing}
            onSave={handleEdit}
            onCancel={() => { setModal(null); setEditing(null); }}
            saving={saving}
          />
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => handleDelete(editing.id)}
              className="text-xs text-red-400 hover:text-red-600"
            >
              Elimina questo negozio
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
