/**
 * Server-only half of src/lib/brand.ts — kept separate because it imports
 * next/headers, which cannot be bundled into client components (several of
 * which import brand.ts for the pure types/defaults/sanitizers).
 */

import { cookies } from "next/headers";
import { type Brand, ADMIN_BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";

export async function getAdminBrand(): Promise<Brand> {
  const store = await cookies();
  const value = store.get(ADMIN_BRAND_COOKIE)?.value;
  return isBrand(value) ? value : DEFAULT_BRAND;
}
