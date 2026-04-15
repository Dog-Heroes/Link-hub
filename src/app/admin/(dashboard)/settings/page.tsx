import { db } from "@/lib/db";
import SettingsForm from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let settings: Record<string, string> = {};

  try {
    const result = await db.execute("SELECT key, value FROM settings");
    for (const row of result.rows) {
      settings[String(row.key)] = String(row.value);
    }
  } catch {
    // DB not seeded
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#002B49] mb-6">Impostazioni</h1>
      <SettingsForm initial={settings} />
    </div>
  );
}
