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

    -- Store locator
    CREATE TABLE IF NOT EXISTS stores (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      type          TEXT NOT NULL DEFAULT 'rivenditore',
      chain         TEXT NOT NULL DEFAULT '',
      address       TEXT NOT NULL DEFAULT '',
      city          TEXT NOT NULL DEFAULT '',
      zip           TEXT NOT NULL DEFAULT '',
      region        TEXT NOT NULL DEFAULT '',
      lat           REAL NOT NULL DEFAULT 0,
      lng           REAL NOT NULL DEFAULT 0,
      phone         TEXT NOT NULL DEFAULT '',
      email         TEXT NOT NULL DEFAULT '',
      website       TEXT NOT NULL DEFAULT '',
      opening_hours TEXT NOT NULL DEFAULT '{}',
      tags          TEXT NOT NULL DEFAULT '[]',
      icon          TEXT NOT NULL DEFAULT '',
      enabled       INTEGER NOT NULL DEFAULT 1
    );

    -- Index for analytics queries
    CREATE INDEX IF NOT EXISTS idx_events_link_id ON events(link_id);
    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
    CREATE INDEX IF NOT EXISTS idx_links_section_id ON links(section_id);
    CREATE INDEX IF NOT EXISTS idx_sections_tab_id ON sections(tab_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_options_field ON quiz_options(field);
    CREATE INDEX IF NOT EXISTS idx_stores_chain ON stores(chain);
    CREATE INDEX IF NOT EXISTS idx_stores_enabled ON stores(enabled);
  `);
}
