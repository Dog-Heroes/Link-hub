export function trackEvent(event: string, properties?: Record<string, string>) {
  // GA4 + Klaviyo tracking — implementation pending
  if (typeof window !== "undefined") {
    console.debug("[analytics]", event, properties);
  }
}
