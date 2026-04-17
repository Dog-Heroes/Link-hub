const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? "";
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID ?? "";
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? "";
// Admin API token (classic, with write_themes scope) — separate from Storefront OAuth
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN ?? "";

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  image: string | null;
  price: string;
  currency: string;
  variantId: string;
  checkoutUrl: string;
}

/* ------------------------------------------------------------------ */
/*  Token management: client_credentials → delegate → Storefront      */
/* ------------------------------------------------------------------ */

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getStorefrontToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  // Step 1: get Admin API token via client_credentials
  const oauthRes = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
    }
  );

  if (!oauthRes.ok) {
    throw new Error(`Shopify OAuth error: ${oauthRes.status}`);
  }

  const oauthData = await oauthRes.json();
  const adminToken = oauthData.access_token;

  // Step 2: delegate to Storefront-scoped token
  const delegateRes = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/2025-01/access_tokens/delegate.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminToken,
      },
      body: JSON.stringify({
        delegate_access_scope: [
          "unauthenticated_read_product_listings",
          "unauthenticated_read_product_inventory",
        ],
      }),
    }
  );

  if (!delegateRes.ok) {
    throw new Error(`Shopify delegate error: ${delegateRes.status}`);
  }

  const delegateData = await delegateRes.json();
  cachedToken = {
    token: delegateData.access_token,
    expiresAt: Date.now() + (delegateData.expires_in ?? 86000) * 1000,
  };
  return cachedToken.token;
}

/* ------------------------------------------------------------------ */
/*  Products query (Storefront API)                                    */
/* ------------------------------------------------------------------ */

const PRODUCTS_QUERY = `{
  products(first: 12, sortKey: BEST_SELLING) {
    edges {
      node {
        id
        title
        handle
        images(first: 1) {
          edges {
            node {
              url
              altText
            }
          }
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        variants(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
    }
  }
}`;

function extractNumericId(gid: string): string {
  return gid.split("/").pop() ?? gid;
}

export async function getProducts(): Promise<ShopifyProduct[]> {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
    throw new Error("Shopify credentials not configured");
  }

  const token = await getStorefrontToken();

  const res = await fetch(
    `https://${SHOPIFY_DOMAIN}/api/2025-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Shopify-Storefront-Private-Token": token,
      },
      body: JSON.stringify({ query: PRODUCTS_QUERY }),
    }
  );

  if (!res.ok) {
    throw new Error(`Shopify API error: ${res.status}`);
  }

  const json = await res.json();

  if (json.errors) {
    throw new Error(`Shopify GraphQL: ${json.errors[0]?.message}`);
  }

  const edges = json?.data?.products?.edges ?? [];

  return edges.map(
    (edge: {
      node: {
        id: string;
        title: string;
        handle: string;
        images: { edges: { node: { url: string; altText: string | null } }[] };
        priceRange: {
          minVariantPrice: { amount: string; currencyCode: string };
        };
        variants: { edges: { node: { id: string } }[] };
      };
    }) => {
      const node = edge.node;
      const variantGid = node.variants.edges[0]?.node.id ?? "";
      const variantId = extractNumericId(variantGid);

      return {
        id: node.id,
        title: node.title,
        handle: node.handle,
        image: node.images.edges[0]?.node.url ?? null,
        price: node.priceRange.minVariantPrice.amount,
        currency: node.priceRange.minVariantPrice.currencyCode,
        variantId,
        checkoutUrl: `https://${SHOPIFY_DOMAIN}/cart/${variantId}:1`,
      };
    }
  );
}

/* ------------------------------------------------------------------ */
/*  Shopify Admin API — push store-locations.json as theme asset      */
/* ------------------------------------------------------------------ */

/**
 * Pushes the given JSON data to Shopify as `assets/store-locations.json`
 * on the active theme. Requires SHOPIFY_ADMIN_TOKEN with write_themes scope.
 *
 * @param stores - Array of store objects to serialize and push
 * @returns { themeId, key } on success
 * @throws Error if credentials missing or API call fails
 */
export async function pushStoreLocationsToShopify(
  stores: unknown[]
): Promise<{ themeId: string; key: string }> {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_ADMIN_TOKEN) {
    throw new Error(
      "SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_TOKEN not configured"
    );
  }

  // Step 1: find the active (main) theme
  const themesRes = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/2025-01/themes.json`,
    {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
        "Content-Type": "application/json",
      },
    }
  );

  if (!themesRes.ok) {
    throw new Error(`Shopify themes list error: ${themesRes.status}`);
  }

  const themesData = await themesRes.json();
  const activeTheme = (
    themesData.themes as Array<{ id: number; role: string }>
  ).find((t) => t.role === "main");

  if (!activeTheme) {
    throw new Error("No active (main) theme found on Shopify store");
  }

  const themeId = String(activeTheme.id);

  // Step 2: upload the asset
  const assetKey = "assets/store-locations.json";
  const assetValue = JSON.stringify(stores, null, 2);

  const assetRes = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/2025-01/themes/${themeId}/assets.json`,
    {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        asset: {
          key: assetKey,
          value: assetValue,
        },
      }),
    }
  );

  if (!assetRes.ok) {
    const errBody = await assetRes.text();
    throw new Error(
      `Shopify asset PUT error ${assetRes.status}: ${errBody}`
    );
  }

  return { themeId, key: assetKey };
}
