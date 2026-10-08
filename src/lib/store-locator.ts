/**
 * Store locator — reads from the store locator ALREADY LIVE on the main
 * Shopify theme (https://www.dogheroes.it/pages/punti-vendita), instead of
 * keeping a separate database synced to Shopify.
 *
 * The theme page exposes the data file URL via a `data-data-url` attribute
 * on the widget (see snippets/store-locator-widget.liquid in
 * Dog-Heroes/dogheroes-theme). That URL changes with every theme deploy
 * (CDN path includes the theme id + a version hash), so it must be read
 * from the page rather than hardcoded.
 */

import storesFallback from "@/config/stores.json";

export const STORE_LOCATOR_PAGE_URL =
  "https://www.dogheroes.it/pages/punti-vendita";

export interface StoreLocation {
  id: string;
  name: string;
  type: string;
  chain: string;
  address: string;
  city: string;
  zip: string;
  region?: string;
  lat: number;
  lng: number;
  phone: string;
  email: string;
  website: string;
  opening_hours: Record<string, string>;
  tags: string[];
  icon: string;
  brands?: string[];
}

interface ThemeStoreLocationsFile {
  icons?: Record<string, string>;
  stores: ThemeStore[];
}

interface ThemeStore {
  id: string;
  name: string;
  type?: string;
  chain?: string;
  address?: string;
  city?: string;
  zip?: string;
  region?: string;
  lat: number;
  lng: number;
  phone?: string;
  email?: string;
  website?: string;
  opening_hours?: Record<string, string>;
  tags?: string[];
  brands?: string[];
}

const DATA_URL_ATTR = /data-data-url=["']([^"']+)["']/;

function resolveUrl(url: string): string {
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("http")) return url;
  return `https://www.dogheroes.it${url.startsWith("/") ? "" : "/"}${url}`;
}

function normalize(file: ThemeStoreLocationsFile): StoreLocation[] {
  const icons = file.icons ?? {};
  return (file.stores ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type ?? "rivenditore",
    chain: s.chain ?? "",
    address: s.address ?? "",
    city: s.city ?? "",
    zip: s.zip ?? "",
    region: s.region ?? "",
    lat: s.lat,
    lng: s.lng,
    phone: s.phone ?? "",
    email: s.email ?? "",
    website: s.website ?? "",
    opening_hours: s.opening_hours ?? {},
    tags: s.tags ?? [],
    icon: (s.chain && icons[s.chain]) || "",
    brands: s.brands,
  }));
}

/**
 * Fetches the store list from the live dogheroes.it store locator page.
 * Falls back to the static JSON snapshot bundled in the repo
 * (src/config/stores.json) if the site cannot be reached, or returns an
 * unexpected shape.
 */
export async function getStoreLocations(): Promise<StoreLocation[]> {
  try {
    const pageRes = await fetch(STORE_LOCATOR_PAGE_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 },
    });
    if (!pageRes.ok) throw new Error(`page fetch ${pageRes.status}`);

    const html = await pageRes.text();
    const match = html.match(DATA_URL_ATTR);
    if (!match) throw new Error("data-data-url not found on page");

    const dataUrl = resolveUrl(match[1]);
    const dataRes = await fetch(dataUrl, { next: { revalidate: 3600 } });
    if (!dataRes.ok) throw new Error(`data fetch ${dataRes.status}`);

    const json = (await dataRes.json()) as ThemeStoreLocationsFile;
    if (!Array.isArray(json.stores)) throw new Error("unexpected JSON shape");

    return normalize(json);
  } catch {
    // Site unreachable / shape changed — serve the bundled snapshot so the
    // hub never shows an empty store locator.
    return storesFallback as StoreLocation[];
  }
}
