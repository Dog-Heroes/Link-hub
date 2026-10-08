"use client";

import { useEffect } from "react";

/**
 * Fires a single "view" event on mount.
 */
export default function ViewTracker({ brand = "dog" }: { brand?: "dog" | "cat" }) {
  useEffect(() => {
    const payload = JSON.stringify({
      event_type: "view",
      referrer: document.referrer || null,
      brand,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/track",
        new Blob([payload], { type: "application/json" })
      );
    } else {
      fetch("/api/track", {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  }, [brand]);

  return null;
}
