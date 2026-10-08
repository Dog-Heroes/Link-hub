import type { Metadata } from "next";
import HubShell from "@/components/hub/HubShell";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_TITLE = "Cat Heroes | Link Hub";
const DEFAULT_DESCRIPTION = "Tutto Cat Heroes in un unico posto";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const rows = await db.execute({
      sql: "SELECT key, value FROM brand_settings WHERE brand = 'cat' AND key IN ('meta_title', 'meta_description')",
      args: [],
    });
    const settings: Record<string, string> = {};
    for (const row of rows.rows) settings[String(row.key)] = String(row.value);

    const title = settings.meta_title || DEFAULT_TITLE;
    const description = settings.meta_description || DEFAULT_DESCRIPTION;

    return {
      title,
      description,
      openGraph: { title, description },
    };
  } catch {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      openGraph: { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
    };
  }
}

export default function CatPage() {
  return <HubShell brand="cat" />;
}
