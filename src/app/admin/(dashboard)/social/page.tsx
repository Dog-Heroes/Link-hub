import { db } from "@/lib/db";
import SocialManager from "@/components/admin/SocialManager";

export const dynamic = "force-dynamic";

export default async function SocialPage() {
  let socials: { id: string; platform: string; url: string; order: number; enabled: number }[] = [];

  try {
    const result = await db.execute('SELECT * FROM social_links ORDER BY "order"');
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
      <h1 className="text-2xl font-bold text-[#002B49] mb-6">Gestione Social</h1>
      <SocialManager initial={socials} />
    </div>
  );
}
