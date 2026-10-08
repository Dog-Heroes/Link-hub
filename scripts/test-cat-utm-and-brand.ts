/**
 * Checks the Cat Heroes (/cat) multi-brand additions:
 *   - fixed UTM: utm_source=linktree_cat for brand "cat" (vs "linktree" for
 *     "dog"), same utm_medium=bio and ?s= campaign mapping as before.
 *   - src/lib/brand.ts helpers: isBrand, linksTabId, defaultStyleFor,
 *     sanitizeStyle (colors/fonts/radius/URLs validated, bad values
 *     dropped), contrastRatio, styleToCSSVars.
 *
 * Not a full test-runner suite (none is configured in this project — see
 * package.json) — a standalone script that exits non-zero on failure,
 * runnable the same way as scripts/test-bridge-url.ts:
 *
 *   npx tsx scripts/test-cat-utm-and-brand.ts
 */

import { getFixedUTM } from "../src/lib/utm";
import {
  isBrand,
  linksTabId,
  defaultStyleFor,
  sanitizeStyle,
  contrastRatio,
  styleToCSSVars,
  isCuratedFont,
  CAT_DEFAULT_STYLE,
  DOG_DEFAULT_STYLE,
} from "../src/lib/brand";

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`✗ ${message}`);
  } else {
    console.log(`✓ ${message}`);
  }
}

function main() {
  // --- UTM ---
  const dogUtm = getFixedUTM(new URLSearchParams(""), "dog");
  assert(dogUtm.utm_source === "linktree", "dog: utm_source=linktree");

  const catUtm = getFixedUTM(new URLSearchParams(""), "cat");
  assert(catUtm.utm_source === "linktree_cat", "cat: utm_source=linktree_cat");
  assert(catUtm.utm_medium === "bio", "cat: utm_medium=bio (same as dog)");

  const catUtmIg = getFixedUTM(new URLSearchParams("s=ig"), "cat");
  assert(catUtmIg.utm_campaign === "instagram", "cat: ?s=ig still maps to utm_campaign=instagram");

  const defaultBrandUtm = getFixedUTM(new URLSearchParams(""));
  assert(defaultBrandUtm.utm_source === "linktree", "no brand arg defaults to dog's utm_source");

  // --- Brand helpers ---
  assert(isBrand("dog") && isBrand("cat"), "isBrand accepts dog/cat");
  assert(!isBrand("ferret") && !isBrand(undefined), "isBrand rejects anything else");

  assert(linksTabId("dog") === "links", "dog links tab id is 'links' (unchanged)");
  assert(linksTabId("cat") === "links-cat", "cat links tab id is 'links-cat'");

  // --- Style defaults ---
  assert(DOG_DEFAULT_STYLE.colorAccent === "#E1251B", "dog default accent matches the production red");
  assert(DOG_DEFAULT_STYLE.fontHeading === "GT Pressura", "dog default heading font is the already-loaded brand font (pixel-identical to prod)");
  assert(CAT_DEFAULT_STYLE.colorPrimary === "#F9EC64", "cat default primary is the Cat Heroes yellow");
  assert(CAT_DEFAULT_STYLE.colorAccent === "#111111", "cat default accent is black");
  assert(defaultStyleFor("dog") !== defaultStyleFor("cat"), "dog and cat defaults are distinct objects");

  // --- sanitizeStyle: valid values pass through ---
  const validInput = sanitizeStyle({
    colorPrimary: "#ABCDEF",
    fontHeading: "Poppins",
    radius: "24",
    logoUrl: "https://example.com/logo.png",
  });
  assert(validInput.colorPrimary === "#ABCDEF", "sanitizeStyle accepts a valid 6-digit hex color");
  assert(validInput.fontHeading === "Poppins", "sanitizeStyle accepts a curated font");
  assert(validInput.radius === 24, "sanitizeStyle parses a numeric-string radius");
  assert(validInput.logoUrl === "https://example.com/logo.png", "sanitizeStyle accepts an https logo URL");

  // --- sanitizeStyle: invalid values are dropped, not thrown ---
  const invalidInput = sanitizeStyle({
    colorPrimary: "not-a-color",
    fontHeading: "Comic Sans MS", // not in the curated list
    radius: "9999",
    logoUrl: "javascript:alert(1)",
    headerImageUrl: "ftp://example.com/x.png",
  });
  assert(invalidInput.colorPrimary === undefined, "sanitizeStyle drops an invalid color instead of storing it");
  assert(invalidInput.fontHeading === undefined, "sanitizeStyle drops a non-curated font");
  assert(invalidInput.radius === 32, "sanitizeStyle clamps an out-of-range radius to the 0-32 max");
  assert(invalidInput.logoUrl === undefined, "sanitizeStyle rejects a javascript: URL for the logo");
  assert(invalidInput.headerImageUrl === undefined, "sanitizeStyle rejects a non-https, non-local URL");

  // A local public asset path (no scheme) is accepted.
  const localAsset = sanitizeStyle({ logoUrl: "/catheroes-logo.webp" });
  assert(localAsset.logoUrl === "/catheroes-logo.webp", "sanitizeStyle accepts a local /public asset path");

  assert(isCuratedFont("Inter") && isCuratedFont("GT Pressura"), "isCuratedFont accepts the built-in fonts too");
  assert(!isCuratedFont("Papyrus"), "isCuratedFont rejects a font outside the curated list");

  // --- contrastRatio: sanity checks (WCAG-style relative luminance) ---
  assert(contrastRatio("#000000", "#FFFFFF") > 20, "black on white has very high contrast");
  assert(contrastRatio("#FFFFFF", "#FFFFFF") === 1, "identical colors have a contrast ratio of 1");
  assert(contrastRatio("#111111", "#F9EC64") > 10, "Cat Heroes default (black on yellow) has strong contrast");

  // --- styleToCSSVars: produces the expected custom properties ---
  const vars = styleToCSSVars(CAT_DEFAULT_STYLE);
  assert(vars["--brand-color-primary"] === "#F9EC64", "styleToCSSVars maps colorPrimary to --brand-color-primary");
  assert(vars["--brand-radius"] === "16px", "styleToCSSVars formats radius with a px unit");
  assert(vars["--font-brand"].includes("Inter"), "styleToCSSVars overrides --font-brand with the brand's heading font");

  console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
