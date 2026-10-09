import { createClient, type Client } from "@libsql/client";

/**
 * Lazily-created singleton client — deliberately NOT created at module load
 * time. Reason: standalone scripts (scripts/seed.ts, scripts/seed-cat.ts)
 * import `db` from this module, and in a standard ES module graph all
 * `import` statements are hoisted and evaluated before the importing
 * script's own top-level code runs — including a script's own call to load
 * `.env.local` (see those scripts). If this client were built eagerly here,
 * `process.env.TURSO_DATABASE_URL` would be read before `.env.local` had a
 * chance to populate it, silently falling back to the local SQLite file
 * below — exactly the bug behind the 9 Oct 2026 incident where
 * `npx tsx scripts/seed-cat.ts` reported success but had written to
 * `local.db` on the operator's machine instead of the shared Turso database
 * (see AGENTS.md and those scripts for the full story). Deferring the
 * `createClient()` call to first actual use (via this Proxy) means it only
 * runs after the calling script has already loaded its env, however it does
 * so — import order no longer matters.
 */
let _client: Client | null = null;

function getClient(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

export const db: Client = new Proxy({} as Client, {
  get(_target, prop, _receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/** What `db` is currently pointed at — used by scripts to print a clear, unambiguous target before writing. Never includes the auth token. */
export function describeDbTarget(): string {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) return "file:local.db (FALLBACK LOCALE — TURSO_DATABASE_URL non impostata, nessun dato va al DB condiviso)";
  if (url.startsWith("file:")) return `${url} (file locale — NON il DB condiviso Turso)`;
  try {
    const { protocol, host } = new URL(url.replace(/^libsql:/, "https:"));
    return `${protocol.replace("https:", "libsql:")}//${host} (DB remoto Turso — CONDIVISO con la produzione)`;
  } catch {
    return `${url} (DB remoto)`;
  }
}

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

/**
 * Runs migrate() automatically, once per server process, before any request
 * is served — called from src/instrumentation.ts's register() hook (Next.js
 * runs that once per new server instance and waits for it to finish before
 * accepting traffic). migrate() is additive/idempotent, so it's safe to run
 * against the shared production DB on every boot.
 *
 * Also exported so any code path that touches a `brand` column/table can
 * call it directly as a defensive fallback (e.g. local `next dev` without
 * instrumentation, or a race on a very first request) — memoized, so a
 * second call is a no-op await on the same promise. On failure the promise
 * is reset so the next call retries (a single failed boot never locks the
 * app out of ever migrating), and the error is only logged, never thrown
 * further than here lets call it — callers decide whether to fall back.
 */
let migratedPromise: Promise<void> | null = null;

export function ensureMigrated(): Promise<void> {
  if (!migratedPromise) {
    migratedPromise = migrate().catch((err) => {
      console.error("[db] migration failed:", err);
      migratedPromise = null; // allow a retry on the next call
      throw err;
    });
  }
  return migratedPromise;
}
