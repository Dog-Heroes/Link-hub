"use client";

import { useEffect } from "react";

/**
 * Fires a single "view" event on mount.
 */
export default function ViewTracker() {
  useEffect(() => {
    const payload = JSON.stringify({
      event_type: "view",
      referrer: document.referrer || null,
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
  }, []);

  return null;
}
