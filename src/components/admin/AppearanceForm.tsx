"use client";

import { useMemo, useState } from "react";
import {
  CURATED_FONTS,
  contrastRatio,
  defaultStyleFor,
  googleFontHref,
  type Brand,
  type BrandStyle,
} from "@/lib/brand";

interface Props {
  brand: Brand;
  initial: BrandStyle;
}

const COLOR_FIELDS: { key: keyof BrandStyle; label: string; hint?: string }[] = [
  { key: "colorPrimary", label: "Colore primario" },
  { key: "colorAccent", label: "Accento (pulsanti, link attivi)" },
  { key: "colorPageBg", label: "Sfondo pagina" },
  { key: "colorHeaderBg", label: "Sfondo header" },
  { key: "colorHeaderText", label: "Testo header" },
  { key: "colorText", label: "Testo" },
  { key: "colorCardBg", label: "Sfondo card/pulsanti" },
  { key: "colorButtonText", label: "Testo sui pulsanti" },
];

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <label className="text-sm text-gray-600">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#([0-9a-fA-F]{6})$/.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 text-xs font-mono border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#E1251B]"
        />
      </div>
    </div>
  );
}

export default function AppearanceForm({ brand, initial }: Props) {
  const [style, setStyle] = useState<BrandStyle>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof BrandStyle>(key: K, value: BrandStyle[K]) {
    setStyle((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    await fetch("/api/admin/brand-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand, values: style }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function resetToDefault() {
    await fetch("/api/admin/brand-settings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand, scope: "style" }),
    });
    setStyle(defaultStyleFor(brand));
    setSaved(false);
  }

  const headerContrast = useMemo(
    () => contrastRatio(style.colorHeaderText, style.colorHeaderBg),
    [style.colorHeaderText, style.colorHeaderBg]
  );
  const textContrast = useMemo(
    () => contrastRatio(style.colorText, style.colorCardBg),
    [style.colorText, style.colorCardBg]
  );
  const buttonContrast = useMemo(
    () => contrastRatio(style.colorButtonText, style.colorAccent),
    [style.colorButtonText, style.colorAccent]
  );

  const lowContrastWarnings = [
    headerContrast < 3 && "Testo header poco leggibile sullo sfondo header (contrasto basso).",
    textContrast < 3 && "Testo poco leggibile sullo sfondo delle card (contrasto basso).",
    buttonContrast < 3 && "Testo dei pulsanti poco leggibile sull'accento (contrasto basso).",
  ].filter(Boolean) as string[];

  const headingFontHref = googleFontHref(style.fontHeading);
  const bodyFontHref = googleFontHref(style.fontBody);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {headingFontHref && <link rel="stylesheet" href={headingFontHref} />}
      {bodyFontHref && <link rel="stylesheet" href={bodyFontHref} />}

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Palette</h2>
        <div className="divide-y divide-gray-100">
          {COLOR_FIELDS.map((f) => (
            <ColorInput
              key={f.key}
              label={f.label}
              value={style[f.key] as string}
              onChange={(v) => set(f.key, v as never)}
            />
          ))}
        </div>

        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mt-6 mb-2">Font</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Titoli</label>
            <select
              value={style.fontHeading}
              onChange={(e) => set("fontHeading", e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            >
              {CURATED_FONTS.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Testo</label>
            <select
              value={style.fontBody}
              onChange={(e) => set("fontBody", e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
            >
              {CURATED_FONTS.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mt-6 mb-2">Forma</h2>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={32}
            value={style.radius}
            onChange={(e) => set("radius", Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-mono text-gray-600 w-12 text-right">{style.radius}px</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Raggio degli angoli di card e pulsanti.</p>

        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mt-6 mb-2">Immagini</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Logo (URL https:// o percorso /pubblico)</label>
            <input
              type="text"
              value={style.logoUrl}
              onChange={(e) => set("logoUrl", e.target.value)}
              placeholder="/catheroes-logo.webp oppure https://..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Immagine header (opzionale)</label>
            <input
              type="text"
              value={style.headerImageUrl}
              onChange={(e) => set("headerImageUrl", e.target.value)}
              placeholder="https://..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono"
            />
          </div>
        </div>

        {lowContrastWarnings.length > 0 && (
          <div className="mt-5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
            {lowContrastWarnings.map((w) => (
              <p key={w} className="text-xs text-amber-800">
                ⚠️ {w}
              </p>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2.5 bg-[#E1251B] text-white text-sm font-bold rounded-lg hover:bg-[#C41E16] disabled:opacity-50 transition-colors"
          >
            {saving ? "Salvando..." : "Salva aspetto"}
          </button>
          <button
            onClick={resetToDefault}
            className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
          >
            Ripristina predefinito
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">Salvato!</span>}
        </div>
      </div>

      {/* Live preview */}
      <div>
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Anteprima</h2>
        <div className="sticky top-6 flex justify-center">
          <div
            className="w-[300px] rounded-[28px] overflow-hidden shadow-xl border border-gray-200"
            style={{ background: style.colorHeaderBg }}
          >
            <div className="px-5 pt-7 pb-4 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={style.logoUrl}
                alt="Logo"
                className="h-10 mx-auto object-contain mb-3"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <p
                className="text-[13px]"
                style={{ color: style.colorHeaderText, fontFamily: `"${style.fontHeading}", sans-serif` }}
              >
                La tua tagline qui
              </p>
              <div className="flex justify-center gap-3 mt-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-4 h-4 rounded-full inline-block"
                    style={{ background: style.colorHeaderText, opacity: 0.85 }}
                  />
                ))}
              </div>
              <div className="flex justify-center gap-2 mt-4">
                <span
                  className="px-4 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: style.colorCardBg, color: style.colorAccent }}
                >
                  Link
                </span>
                <span
                  className="px-4 py-1.5 rounded-full text-xs font-bold border"
                  style={{ borderColor: `${style.colorHeaderText}80`, color: style.colorHeaderText }}
                >
                  Store
                </span>
              </div>
            </div>

            <div
              className="p-4 space-y-2.5"
              style={{ background: style.colorCardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
            >
              <div
                className="w-full text-center py-3 font-extrabold text-sm uppercase"
                style={{
                  background: style.colorAccent,
                  color: style.colorButtonText,
                  borderRadius: style.radius,
                }}
              >
                Pulsante principale
              </div>
              <div
                className="flex items-center gap-3 px-3.5 py-3 border-2"
                style={{
                  borderColor: `${style.colorText}15`,
                  borderRadius: style.radius,
                  fontFamily: `"${style.fontBody}", sans-serif`,
                }}
              >
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: `${style.colorAccent}20`, color: style.colorAccent }}
                >
                  ★
                </span>
                <span className="text-sm font-bold" style={{ color: style.colorText }}>
                  Esempio di link
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
