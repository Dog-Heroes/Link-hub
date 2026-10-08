/**
 * Checks the UTM special-case for Shopify `/discount/CODE?redirect=...`
 * links (src/lib/utm.ts, appendUTM): the storefront discount endpoint
 * 302-redirects to `redirect` and (per the Parte B link audit, 08/10/2026)
 * was assumed to drop any OTHER query param that was on the outer URL —
 * so the hub's fixed UTM must be embedded inside the `redirect` param's own
 * value, correctly URL-encoded, rather than appended to the outer URL.
 *
 * Not a full test-runner suite (none is configured in this project yet —
 * see package.json) — a standalone script that exits non-zero on failure,
 * runnable the same way as scripts/test-bridge-url.ts:
 *
 *   npx tsx scripts/test-utm-discount-redirect.ts
 */

import { appendUTM, getFixedUTM, isSiteUrl } from "../src/lib/utm";

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
  const utm = getFixedUTM(new URLSearchParams(""));
  assert(utm.utm_source === "linktree" && utm.utm_medium === "bio", "fixed UTM is utm_source=linktree&utm_medium=bio");

  const boxLink = "https://www.dogheroes.it/discount/LTREE30?redirect=/pages/quiz";
  assert(isSiteUrl(boxLink), "the box-prova discount link is treated as a Dog Heroes site URL (gets a UTM)");

  const result = appendUTM(boxLink, utm);
  const outer = new URL(result);

  // The UTM must NOT be appended at the top level of the outer URL...
  assert(!outer.searchParams.has("utm_source"), "utm_source is NOT on the outer /discount/ URL");
  assert(!outer.searchParams.has("utm_medium"), "utm_medium is NOT on the outer /discount/ URL");

  // ...it must be inside the `redirect` param's own (decoded) value instead.
  const redirectValue = outer.searchParams.get("redirect") ?? "";
  const redirectUrl = new URL(redirectValue, "https://www.dogheroes.it");
  assert(redirectUrl.pathname === "/pages/quiz", "redirect still points at /pages/quiz");
  assert(redirectUrl.searchParams.get("utm_source") === "linktree", "utm_source is nested inside redirect's value");
  assert(redirectUrl.searchParams.get("utm_medium") === "bio", "utm_medium is nested inside redirect's value");

  // The discount code itself and the outer path must be untouched.
  assert(outer.pathname === "/discount/LTREE30", "discount code path is untouched");
  assert(outer.origin === "https://www.dogheroes.it", "host is untouched");

  // appendUTM never overwrites a utm_* the redirect value already carries.
  const alreadyTagged = "https://www.dogheroes.it/discount/LTREE30?redirect=" + encodeURIComponent("/pages/quiz?utm_source=existing");
  const resultKeepsExisting = appendUTM(alreadyTagged, utm);
  const nestedKept = new URL(new URL(resultKeepsExisting).searchParams.get("redirect") ?? "", "https://www.dogheroes.it");
  assert(nestedKept.searchParams.get("utm_source") === "existing", "a utm_source already inside redirect's value is never overwritten");

  // A normal (non-/discount/) Dog Heroes URL keeps the old, outer-UTM behavior.
  const plain = appendUTM("https://www.dogheroes.it/pages/quiz", utm);
  const plainParams = new URL(plain).searchParams;
  assert(plainParams.get("utm_source") === "linktree", "a plain (non-discount) URL still gets the outer UTM as before");

  console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
