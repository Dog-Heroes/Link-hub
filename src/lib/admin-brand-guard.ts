import { db } from "@/lib/db";
import type { Brand } from "@/lib/brand";

/**
 * Ownership check shared by the admin tabs/sections/links/social API routes
 * (see AGENTS.md, "Admin — switch brand"): every write that targets an
 * existing row by id must first confirm that row actually belongs to the
 * brand currently active in the admin cookie — never trust a client-sent
 * `brand`, and never let a PATCH/DELETE for one brand touch a row tagged
 * with the other (e.g. a stale id typed in devtools, or a bug in the UI).
 *
 * Returns "missing" if the row doesn't exist (caller returns 404), "other-brand"
 * if it belongs to a different brand (caller returns 403), or "ok".
 */
export async function checkRowBrand(
  table: "tabs" | "sections" | "social_links",
  id: string,
  activeBrand: Brand
): Promise<"ok" | "missing" | "other-brand"> {
  const result = await db.execute({ sql: `SELECT brand FROM ${table} WHERE id = ?`, args: [id] });
  const row = result.rows[0];
  if (!row) return "missing";
  return String(row.brand) === activeBrand ? "ok" : "other-brand";
}

/**
 * Same check for a `links` row, but ownership is via its parent section
 * (see POST /api/admin/links: a link's brand is always derived from its
 * section, never trusted from the client) — checking the link's own
 * `brand` column is equivalent and cheaper, so that's what this does.
 */
export async function checkLinkBrand(id: string, activeBrand: Brand): Promise<"ok" | "missing" | "other-brand"> {
  const result = await db.execute({ sql: "SELECT brand FROM links WHERE id = ?", args: [id] });
  const row = result.rows[0];
  if (!row) return "missing";
  return String(row.brand) === activeBrand ? "ok" : "other-brand";
}
