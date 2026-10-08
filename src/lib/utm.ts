export type UTMParams = Partial<
  Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_term" | "utm_content", string>
>;

/**
 * Fixed attribution the hub always stamps on its own outbound links.
 * The Cat Heroes page (`/cat`) gets its own utm_source ("linktree_cat") so
 * its traffic is distinguishable from the dog hub ("linktree") — see
 * AGENTS.md / decisione Marco (A).
 */
const FIXED_SOURCE_BY_BRAND: Record<string, string> = {
  dog: "linktree",
  cat: "linktree_cat",
};
const FIXED_MEDIUM = "bio";

/**
 * Maps the hub's own `?s=` short param (used in the hub URL shared on a
 * given platform, e.g. the link in an Instagram bio) to a UTM campaign
 * value. Small and meant to grow as new platforms get their own `?s=`.
 */
const CAMPAIGN_BY_SOURCE: Record<string, string> = {
  ig: "instagram",
  tt: "tiktok",
};

/**
 * Builds the UTM the hub stamps on every link it generates towards the
 * Dog Heroes site (CMS links, hero CTA, shop, quiz bridge): utm_source and
 * utm_medium are always fixed to "linktree"/"bio" — an incoming UTM on the
 * hub URL never overrides them. utm_campaign comes only from the hub's own
 * `?s=` short param (ig -> instagram, tt -> tiktok); with no match, no
 * campaign at all (an incoming utm_campaign is ignored too). Any other
 * incoming UTM (utm_term, utm_content) passes through unchanged.
 */
export function getUTMFromURL(brand: string = "dog"): UTMParams {
  if (typeof window === "undefined") return {};
  return getFixedUTM(new URLSearchParams(window.location.search), brand);
}

/**
 * Same as {@link getUTMFromURL} but takes `URLSearchParams` directly —
 * exported so it can be exercised from a plain Node script (no `window`),
 * e.g. scripts/test-bridge-url.ts. `brand` selects the fixed utm_source
 * ("linktree" for dog, "linktree_cat" for cat — see
 * {@link FIXED_SOURCE_BY_BRAND}).
 */
export function getFixedUTM(params: URLSearchParams, brand: string = "dog"): UTMParams {
  const utm: UTMParams = {
    utm_source: FIXED_SOURCE_BY_BRAND[brand] ?? FIXED_SOURCE_BY_BRAND.dog,
    utm_medium: FIXED_MEDIUM,
  };

  const s = params.get("s");
  const campaign = s ? CAMPAIGN_BY_SOURCE[s] : undefined;
  if (campaign) utm.utm_campaign = campaign;

  const term = params.get("utm_term");
  if (term) utm.utm_term = term;

  const content = params.get("utm_content");
  if (content) utm.utm_content = content;

  return utm;
}

/**
 * True when `url` points at the Dog Heroes site (dogheroes.it, dogheroes.com,
 * the myshopify storefront, …) — the only destinations that get the hub's
 * fixed UTM. External platforms (social, YouTube, Trustpilot, Notion,
 * Empathy…) are left untouched, without any UTM at all.
 */
export function isSiteUrl(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase().includes("dogheroes");
  } catch {
    return false;
  }
}

/**
 * True for a Shopify `/discount/CODE?redirect=...` deep link: the storefront
 * applies the discount then 302-redirects to `redirect`. To guarantee the
 * hub's UTM survives that hop regardless of how the outer query string is
 * handled, it is stamped *inside* `redirect`'s own value rather than on the
 * outer URL — see {@link appendUTM}. (Verified via `curl -sIL` on
 * dogheroes.it: a UTM nested this way does reach the final page; whether an
 * outer-level UTM would also survive is not relied upon here.)
 */
function isDiscountRedirectUrl(parsed: URL): boolean {
  return parsed.pathname.toLowerCase().startsWith("/discount/") && parsed.searchParams.has("redirect");
}

/**
 * Appends `utm` to `url` — but NEVER overwrites a utm_* the destination
 * already carries (e.g. a link pasted by hand in the CMS with its own
 * ?utm_source=... already set): the automatic addition is simply skipped
 * for whichever keys are already present.
 *
 * Special case: a `/discount/CODE?redirect=...` link (see
 * {@link isDiscountRedirectUrl}) gets the UTM stamped *inside* the
 * `redirect` param's own value instead of on the outer URL, so it survives
 * Shopify's redirect to the destination page.
 */
export function appendUTM(url: string, utm: UTMParams): string {
  try {
    const parsed = new URL(url);

    if (isDiscountRedirectUrl(parsed)) {
      const redirectRaw = parsed.searchParams.get("redirect") ?? "/";
      const redirectUrl = new URL(redirectRaw, parsed.origin);
      for (const [key, val] of Object.entries(utm)) {
        if (val && !redirectUrl.searchParams.has(key)) redirectUrl.searchParams.set(key, val);
      }
      parsed.searchParams.set("redirect", redirectUrl.pathname + redirectUrl.search);
      return parsed.toString();
    }

    for (const [key, val] of Object.entries(utm)) {
      if (val && !parsed.searchParams.has(key)) parsed.searchParams.set(key, val);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}
