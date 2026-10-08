import { createClient } from "@libsql/client";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

/**
 * Run all migrations to create/update the schema.
 * Safe to call multiple times (uses IF NOT EXISTS).
 */
export async function migrate() {
  await db.executeMultiple(`
    -- Global key/value settings
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Tabs (Links, Shop, Quiz, Store Locator, …)
    CREATE TABLE IF NOT EXISTS tabs (
      id            TEXT PRIMARY KEY,
      label         TEXT NOT NULL,
      icon          TEXT NOT NULL DEFAULT 'link',
      "order"       INTEGER NOT NULL DEFAULT 0,
      enabled       INTEGER NOT NULL DEFAULT 1,
      component_key TEXT NOT NULL
    );

    -- Sections within a tab (e.g. "I più cliccati", "Seguici")
    CREATE TABLE IF NOT EXISTS sections (
      id        TEXT PRIMARY KEY,
      tab_id    TEXT NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
      label     TEXT NOT NULL,
      "order"   INTEGER NOT NULL DEFAULT 0,
      collapsed INTEGER NOT NULL DEFAULT 0,
      type      TEXT NOT NULL DEFAULT 'links'
    );

    -- Individual links inside a section
    CREATE TABLE IF NOT EXISTS links (
      id          TEXT PRIMARY KEY,
      section_id  TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      label       TEXT NOT NULL,
      url         TEXT NOT NULL DEFAULT '',
      icon        TEXT NOT NULL DEFAULT 'link',
      badge       TEXT,
      "order"     INTEGER NOT NULL DEFAULT 0,
      enabled     INTEGER NOT NULL DEFAULT 1,
      link_type   TEXT NOT NULL DEFAULT 'link',
      media_url   TEXT,
      click_count INTEGER NOT NULL DEFAULT 0
    );

    -- Social links in the header
    CREATE TABLE IF NOT EXISTS social_links (
      id       TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      url      TEXT NOT NULL,
      "order"  INTEGER NOT NULL DEFAULT 0,
      enabled  INTEGER NOT NULL DEFAULT 1
    );

    -- Quiz options (breeds, diets, allergies, etc.)
    CREATE TABLE IF NOT EXISTS quiz_options (
      id      TEXT PRIMARY KEY,
      field   TEXT NOT NULL,
      value   TEXT NOT NULL,
      label   TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      extra   TEXT
    );

    -- Click events for analytics
    CREATE TABLE IF NOT EXISTS events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      link_id    TEXT REFERENCES links(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL DEFAULT 'click',
      referrer   TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Store locator: NON creare piu' una tabella "stores" propria.
    -- Dal refactor store-locator-admin (ott 2026) /api/stores legge i negozi
    -- direttamente dallo store locator gia' live sul tema Shopify
    -- (dogheroes.it/pages/punti-vendita, vedi src/lib/store-locator.ts),
    -- con fallback al JSON statico src/config/stores.json. Una eventuale
    -- vecchia tabella "stores" in un DB esistente NON va droppata qui
    -- (dati di produzione): resta semplicemente inutilizzata.

    -- Multi-brand (dog / cat, see src/lib/brand.ts): per-brand settings such
    -- as tagline, meta title/description and the editable "Aspetto" style.
    -- Kept SEPARATE from the pre-existing global settings table (whose
    -- primary key has no brand dimension and must not change) -- /hub keeps
    -- reading that table exactly as before.
    CREATE TABLE IF NOT EXISTS brand_settings (
      brand TEXT NOT NULL,
      key   TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (brand, key)
    );

    -- Index for analytics queries
    CREATE INDEX IF NOT EXISTS idx_events_link_id ON events(link_id);
    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
    CREATE INDEX IF NOT EXISTS idx_links_section_id ON links(section_id);
    CREATE INDEX IF NOT EXISTS idx_sections_tab_id ON sections(tab_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_options_field ON quiz_options(field);
  `);

  // Additive, backward-compatible column: every existing row defaults to
  // 'dog' so /hub (and any code already deployed) keeps working unchanged
  // after this migration runs. Guarded by PRAGMA table_info so it's safe to
  // call on every boot (ALTER TABLE ... ADD COLUMN has no "IF NOT EXISTS" in
  // SQLite/libSQL).
  await addColumnIfMissing("tabs", "brand", "TEXT NOT NULL DEFAULT 'dog'");
  await addColumnIfMissing("sections", "brand", "TEXT NOT NULL DEFAULT 'dog'");
  await addColumnIfMissing("links", "brand", "TEXT NOT NULL DEFAULT 'dog'");
  await addColumnIfMissing("social_links", "brand", "TEXT NOT NULL DEFAULT 'dog'");
  // Lets analytics be split by brand even for events with no link_id (page
  // views, store searches…) where the brand can't be derived by joining
  // through `links`.
  await addColumnIfMissing("events", "brand", "TEXT NOT NULL DEFAULT 'dog'");
}

async function addColumnIfMissing(table: string, column: string, definition: string) {
  const info = await db.execute(`PRAGMA table_info(${table})`);
  const exists = info.rows.some((r) => String(r.name) === column);
  if (!exists) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
