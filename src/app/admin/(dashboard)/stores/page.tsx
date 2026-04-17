import { db } from "@/lib/db";
import { rowToStore } from "@/app/api/admin/stores/route";
import type { Store } from "@/app/api/admin/stores/route";
import StoresManager from "@/components/admin/StoresManager";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  let stores: Store[] = [];

  try {
    const result = await db.execute("SELECT * FROM stores ORDER BY chain, name");
    stores = result.rows.map((r) => rowToStore(r as Record<string, unknown>));
  } catch {
    // DB not initialised yet — show empty state
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#002B49] mb-6">Gestione Negozi</h1>
      <StoresManager initial={stores} />
    </div>
  );
}
