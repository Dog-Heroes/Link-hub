import { db, ensureMigrated } from "@/lib/db";
import SocialManager from "@/components/admin/SocialManager";
import { getAdminBrand } from "@/lib/admin-brand";
import { BRAND_LABEL } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function SocialPage() {
  const brand = await getAdminBrand();
  await ensureMigrated().catch(() => {});
  let socials: { id: string; platform: string; url: string; order: number; enabled: number }[] = [];

  try {
    const result = await db.execute({
      sql: 'SELECT * FROM social_links WHERE brand = ? ORDER BY "order"',
      args: [brand],
    });
    socials = result.rows.map((r) => ({
      id: String(r.id),
      platform: String(r.platform),
      url: String(r.url),
      order: Number(r.order),
      enabled: Number(r.enabled),
    }));
  } catch {
    // DB not seeded
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#002B49] mb-6">Gestione Social — {BRAND_LABEL[brand]}</h1>
      <SocialManager initial={socials} brand={brand} />
    </div>
  );
}
