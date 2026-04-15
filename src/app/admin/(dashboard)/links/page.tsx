import { db } from "@/lib/db";
import LinksManager from "@/components/admin/LinksManager";

export const dynamic = "force-dynamic";

export default async function LinksPage() {
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
    click_count: number;
  }[] = [];

  try {
    const sResult = await db.execute(
      'SELECT id, label, "order", collapsed FROM sections WHERE tab_id = \'links\' ORDER BY "order"'
    );
    sections = sResult.rows.map((r) => ({
      id: String(r.id),
      label: String(r.label),
      order: Number(r.order),
      collapsed: Number(r.collapsed),
    }));

    const lResult = await db.execute(
      'SELECT l.* FROM links l JOIN sections s ON l.section_id = s.id WHERE s.tab_id = \'links\' ORDER BY l."order"'
    );
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
      click_count: Number(r.click_count),
    }));
  } catch {
    // DB not yet seeded
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#002B49] mb-6">Gestione Link</h1>
      <LinksManager initialSections={sections} initialLinks={links} />
    </div>
  );
}
