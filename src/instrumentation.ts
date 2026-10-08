/**
 * Runs once, before the server starts accepting requests — see
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 *
 * Used here to run the additive/idempotent DB migration (src/lib/db.ts,
 * adds the `brand` columns + `brand_settings` table) automatically on boot,
 * so a fresh deploy never serves requests against a not-yet-migrated schema.
 * Safe to run against the shared production DB (see AGENTS.md): every
 * change is `ADD COLUMN`/`CREATE TABLE IF NOT EXISTS`, guarded so it never
 * touches a column/table that already exists.
 *
 * `register()` works in both the Node.js and Edge runtime (this project
 * only uses Node.js API routes/pages, but the file is still invoked once
 * for each), so the actual migration only runs under `NEXT_RUNTIME ===
 * "nodejs"` — @libsql/client needs Node APIs.
 *
 * If the migration fails here (e.g. the DB is briefly unreachable), the
 * error is only logged — the server still starts, and the public pages'
 * own queries fall back to a pre-brand-column-safe path (see
 * src/components/hub/HubShell.tsx), never a hard crash.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { ensureMigrated } = await import("@/lib/db");
  try {
    await ensureMigrated();
    console.log("[db] migration OK at startup");
  } catch (err) {
    console.error("[db] migration failed at startup — queries will fall back where possible:", err);
  }
}
