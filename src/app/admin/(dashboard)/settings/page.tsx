import { db } from "@/lib/db";
import SettingsForm from "@/components/admin/SettingsForm";
import { getAdminBrand } from "@/lib/admin-brand";
import { BRAND_LABEL } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const brand = await getAdminBrand();
  const settings: Record<string, string> = {};

  try {
    if (brand === "dog") {
      const result = await db.execute("SELECT key, value FROM settings");
      for (const row of result.rows) {
        settings[String(row.key)] = String(row.value);
      }
    } else {
      const result = await db.execute({
        sql: "SELECT key, value FROM brand_settings WHERE brand = ?",
        args: [brand],
      });
      for (const row of result.rows) {
        settings[String(row.key)] = String(row.value);
      }
    }
  } catch {
    // DB not seeded
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#002B49] mb-6">Impostazioni — {BRAND_LABEL[brand]}</h1>
      <SettingsForm initial={settings} brand={brand} />
    </div>
  );
}
