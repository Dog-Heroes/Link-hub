import { db } from "@/lib/db";
import TabsManager from "@/components/admin/TabsManager";

export const dynamic = "force-dynamic";

export default async function TabsPage() {
  let tabs: { id: string; label: string; icon: string; order: number; enabled: number; component_key: string }[] = [];

  try {
    const result = await db.execute('SELECT * FROM tabs ORDER BY "order"');
    tabs = result.rows.map((r) => ({
      id: String(r.id),
      label: String(r.label),
      icon: String(r.icon),
      order: Number(r.order),
      enabled: Number(r.enabled),
      component_key: String(r.component_key),
    }));
  } catch {
    // DB not seeded
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#002B49] mb-6">Gestione Tab</h1>
      <TabsManager initial={tabs} />
    </div>
  );
}
