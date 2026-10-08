import { db } from "@/lib/db";
import TabsManager from "@/components/admin/TabsManager";
import { getAdminBrand } from "@/lib/admin-brand";
import { BRAND_LABEL } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function TabsPage() {
  const brand = await getAdminBrand();
  let tabs: { id: string; label: string; icon: string; order: number; enabled: number; component_key: string }[] = [];

  try {
    const result = await db.execute({
      sql: 'SELECT * FROM tabs WHERE brand = ? ORDER BY "order"',
      args: [brand],
    });
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
      <h1 className="text-2xl font-bold text-[#002B49] mb-6">Gestione Tab — {BRAND_LABEL[brand]}</h1>
      <TabsManager initial={tabs} />
    </div>
  );
}
