import { db, ensureMigrated } from "@/lib/db";
import AppearanceForm from "@/components/admin/AppearanceForm";
import { getAdminBrand } from "@/lib/admin-brand";
import { defaultStyleFor, sanitizeStyle, BRAND_LABEL, type BrandStyle } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function AspettoPage() {
  const brand = await getAdminBrand();
  await ensureMigrated().catch(() => {});
  const base = defaultStyleFor(brand);

  let style: BrandStyle = base;
  try {
    const result = await db.execute({
      sql: "SELECT key, value FROM brand_settings WHERE brand = ?",
      args: [brand],
    });
    const raw: Record<string, string> = {};
    for (const row of result.rows) raw[String(row.key)] = String(row.value);
    const sanitized = sanitizeStyle(raw);
    style = { ...base, ...sanitized };
  } catch {
    // DB not seeded — fall back to the brand's default style
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#002B49] mb-1">Aspetto — {BRAND_LABEL[brand]}</h1>
      <p className="text-sm text-gray-500 mb-6">
        Palette, font e logo della pagina pubblica {brand === "cat" ? "/cat" : "/hub"}. Le modifiche sono
        visibili subito nell&apos;anteprima; salva per renderle live.
      </p>
      <AppearanceForm brand={brand} initial={style} />
    </div>
  );
}
