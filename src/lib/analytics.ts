/**
 * Track an event — persists to /api/track via sendBeacon (non-blocking).
 *
 * `brand` ("dog" | "cat", default "dog") lets analytics be split per brand —
 * see src/lib/brand.ts — even for events with no link_id (page views, store
 * searches…), where the brand can't be derived by joining through `links`.
 */
export function trackEvent(
  event: string,
  properties?: Record<string, string>,
  brand: string = "dog"
) {
  if (typeof window === "undefined") return;

  console.debug("[analytics]", event, properties);

  const payload = JSON.stringify({
    event_type: event === "link_hub_click" ? "click" : event,
    link_id: properties?.link_id ?? null,
    referrer: document.referrer || null,
    brand,
  });

  // sendBeacon doesn't block navigation (ideal for outbound clicks)
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
  } else {
    fetch("/api/track", {
      method: "POST",
      body: payload,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {});
  }
}
