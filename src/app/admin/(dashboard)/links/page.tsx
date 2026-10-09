import { db, ensureMigrated } from "@/lib/db";
import LinksManager from "@/components/admin/LinksManager";
import { getAdminBrand } from "@/lib/admin-brand";
import { linksTabId, BRAND_LABEL } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
  const brand = await getAdminBrand();
  await ensureMigrated().catch(() => {});
  const tabId = linksTabId(brand);
  let tabExists = false;
  let sections: { id: string; label: string; order: number; collapsed: number }[] = [];
  let links: {
    id: string;
    section_id: string;
    label: string;
    url: string;
    icon: string;
    badge: string | null;
    order: number;
    enabled: number;
    link_type: string;
    media_url: string | null;
    click_count: number;
  }[] = [];

  try {
    const tabRow = await db.execute({ sql: "SELECT id FROM tabs WHERE id = ?", args: [tabId] });
    tabExists = tabRow.rows.length > 0;

    const sResult = await db.execute({
      sql: 'SELECT id, label, "order", collapsed FROM sections WHERE tab_id = ? ORDER BY "order"',
      args: [tabId],
    });
    sections = sResult.rows.map((r) => ({
      id: String(r.id),
      label: String(r.label),
      order: Number(r.order),
      collapsed: Number(r.collapsed),
    }));

    const lResult = await db.execute({
      sql: 'SELECT l.* FROM links l JOIN sections s ON l.section_id = s.id WHERE s.tab_id = ? ORDER BY l."order"',
      args: [tabId],
    });
    links = lResult.rows.map((r) => ({
      id: String(r.id),
      section_id: String(r.section_id),
      label: String(r.label),
      url: String(r.url),
      icon: String(r.icon),
      badge: r.badge ? String(r.badge) : null,
      order: Number(r.order),
      enabled: Number(r.enabled),
      link_type: String(r.link_type),
      media_url: r.media_url ? String(r.media_url) : null,
      click_count: Number(r.click_count),
    }));
  } catch {
    // DB not yet seeded
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#002B49] mb-6">Gestione Link — {BRAND_LABEL[brand]}</h1>
      <LinksManager initialSections={sections} initialLinks={links} tabId={tabId} brand={brand} tabExists={tabExists} />
    </div>
  );
}
