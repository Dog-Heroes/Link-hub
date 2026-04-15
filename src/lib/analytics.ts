/**
 * Track an event — persists to /api/track via sendBeacon (non-blocking).
 */
export function trackEvent(
  event: string,
  properties?: Record<string, string>
) {
  if (typeof window === "undefined") return;

  console.debug("[analytics]", event, properties);

  const payload = JSON.stringify({
    event_type: event === "link_hub_click" ? "click" : event,
    link_id: properties?.link_id ?? null,
    referrer: document.referrer || null,
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
