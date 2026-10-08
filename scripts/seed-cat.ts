/**
 * Seed script for the Cat Heroes brand (/cat) — idempotent (INSERT OR
 * REPLACE throughout, safe to re-run).
 *
 * ⚠️ DO NOT RUN THIS AGAINST THE SHARED PRODUCTION DATABASE before the code
 * in this PR is merged AND deployed. The DB is shared between local and
 * production (see AGENTS.md): running this script writes live, immediately,
 * to whatever TURSO_DATABASE_URL points at. The correct order is:
 *
 *   1. Merge the PR that adds /cat, the brand columns and this script.
 *   2. Wait for the Render deploy to finish (main -> link-hub-eu). The
 *      schema migration (brand columns + brand_settings table) now runs
 *      AUTOMATICALLY at server startup (src/instrumentation.ts ->
 *      ensureMigrated() in src/lib/db.ts) — no manual step needed for it.
 *   3. Verify /hub still looks identical and /cat responds 200.
 *   4. Only then run this script, against the real (shared) database:
 *        npx tsx scripts/seed-cat.ts
 *      (it still calls migrate() itself too — see below — purely as a
 *      redundant safety net in case this is somehow run before step 2).
 *
 * Before that, test it against an isolated local DB file, e.g.:
 *   TURSO_DATABASE_URL="file:./local-cat-test.db" TURSO_AUTH_TOKEN="" \
 *     npx tsx scripts/seed-cat.ts
 *
 * What it does:
 *   - Runs migrate() (adds the `brand` columns + brand_settings table —
 *     additive/backward-compatible, safe on the existing production data).
 *     Redundant with the automatic startup migration above, but harmless
 *     and idempotent, so kept as a safety net.
 *   - Creates the two Cat Heroes tabs (links-cat, stores-cat).
 *   - Creates one placeholder section with 2–3 links to the Cat Heroes
 *     pages on dogheroes.it — meant to be replaced/edited from /admin
 *     (switch to 🐱 Cat Heroes) right after this runs.
 *   - Sets the Cat Heroes tagline + meta title/description in
 *     brand_settings. Does NOT insert any style_* row: the default Cat
 *     Heroes look (yellow/black, see src/lib/brand.ts CAT_DEFAULT_STYLE)
 *     already applies with zero rows — nothing to seed there.
 *   - Does NOT touch any "dog" row, the global `settings` table, or
 *     social_links (no Cat Heroes social account confirmed yet — add them
 *     from /admin once there are real URLs).
 */

import { db, migrate } from "../src/lib/db";

async function seed() {
  console.log("🔄 Running migrations (adds brand columns + brand_settings, additive-only)...");
  await migrate();
  console.log("✅ Schema ready\n");

  // --- Tabs ---
  console.log("📑 Seeding Cat Heroes tabs...");
  const tabs = [
    { id: "links-cat", label: "Link", icon: "link", order: 0, component: "LinksTab" },
    { id: "stores-cat", label: "Store", icon: "pin", order: 1, component: "StoreLocatorTab" },
  ];
  for (const tab of tabs) {
    await db.execute({
      sql: 'INSERT OR REPLACE INTO tabs (id, label, icon, "order", enabled, component_key, brand) VALUES (?, ?, ?, ?, 1, ?, ?)',
      args: [tab.id, tab.label, tab.icon, tab.order, tab.component, "cat"],
    });
  }
  console.log(`  → ${tabs.length} tabs\n`);

  // --- Sections & links (placeholders — edit from /admin) ---
  console.log("🔗 Seeding placeholder section & links...");
  await db.execute({
    sql: 'INSERT OR REPLACE INTO sections (id, tab_id, label, "order", collapsed, type, brand) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: ["cat-main-links", "links-cat", "Cat Heroes", 0, 0, "links", "cat"],
  });

  const links = [
    {
      id: "cat-link-piano",
      label: "Scopri il piano alimentare per gatti",
      url: "https://www.dogheroes.it/pages/catheroes",
      icon: "sparkle",
    },
    {
      id: "cat-link-blog",
      label: "Blog Cat Heroes",
      url: "https://www.dogheroes.it/blogs/catheroes",
      icon: "link",
    },
    {
      id: "cat-link-shop",
      label: "Tutti i prodotti per gatti",
      url: "https://www.dogheroes.it/collections/cat-heroes",
      icon: "link",
    },
  ];

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    await db.execute({
      sql: 'INSERT OR REPLACE INTO links (id, section_id, label, url, icon, badge, "order", enabled, link_type, brand) VALUES (?, ?, ?, ?, ?, NULL, ?, 1, ?, ?)',
      args: [link.id, "cat-main-links", link.label, link.url, link.icon, i, "link", "cat"],
    });
  }
  console.log(`  → 1 section, ${links.length} links\n`);

  // --- Brand settings: tagline + meta (no style_* rows — defaults apply) ---
  console.log("📝 Seeding Cat Heroes tagline/meta...");
  const brandSettings: [string, string][] = [
    ["tagline", "Il cibo fresco per gatti, firmato Dog Heroes"],
    ["meta_title", "Cat Heroes | Link Hub"],
    ["meta_description", "Tutto Cat Heroes in un unico posto"],
  ];
  for (const [key, value] of brandSettings) {
    await db.execute({
      sql: "INSERT OR REPLACE INTO brand_settings (brand, key, value) VALUES ('cat', ?, ?)",
      args: [key, value],
    });
  }
  console.log(`  → ${brandSettings.length} brand_settings rows\n`);

  console.log("🎉 Cat Heroes seed complete! Go to /admin, switch to 🐱 Cat Heroes, and replace the placeholder links with the real ones.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
