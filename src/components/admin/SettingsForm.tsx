"use client";

import { useState } from "react";

interface Props {
  initial: Record<string, string>;
}

const FIELDS: { key: string; label: string; type?: string }[] = [
  { key: "tagline", label: "Tagline header" },
  { key: "meta_title", label: "Meta title" },
  { key: "meta_description", label: "Meta description" },
  { key: "discount_percent", label: "Sconto (%)", type: "number" },
  { key: "quiz_intro_text", label: "Quiz — testo intro" },
  { key: "quiz_submit_url", label: "Quiz — URL submit" },
  { key: "trustpilot_template_id", label: "Trustpilot template ID" },
  { key: "trustpilot_business_id", label: "Trustpilot business unit ID" },
  { key: "trustpilot_token", label: "Trustpilot token" },
  { key: "trustpilot_locale", label: "Trustpilot locale" },
];

export default function SettingsForm({ initial }: Props) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="grid grid-cols-1 gap-5">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {field.label}
            </label>
            <input
              type={field.type || "text"}
              value={values[field.key] || ""}
              onChange={(e) => set(field.key, e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#E1251B] transition-colors"
            />
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2.5 bg-[#E1251B] text-white text-sm font-bold rounded-lg hover:bg-[#C41E16] disabled:opacity-50 transition-colors"
        >
          {saving ? "Salvando..." : "Salva impostazioni"}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">Salvato!</span>}
      </div>
    </div>
  );
}
