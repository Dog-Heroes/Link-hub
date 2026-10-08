"use client";

import { useSyncExternalStore } from "react";
import { getUTMFromURL, type UTMParams } from "@/lib/utm";

const SERVER_SNAPSHOT: UTMParams = {};

// The hub's own query string (and therefore its UTM) never changes after
// the initial load — the SPA-style tab switches don't touch the URL — so
// there is nothing to actually subscribe to; this is a no-op.
function subscribe(): () => void {
  return () => {};
}

// useSyncExternalStore requires getSnapshot to return a referentially
// stable value when nothing changed (otherwise it re-renders forever
// trying to resync). getUTMFromURL() builds a fresh object every call, so
// it's computed once per brand and cached here.
const cachedSnapshots: Partial<Record<string, UTMParams>> = {};
function makeGetSnapshot(brand: string) {
  return () => {
    if (!cachedSnapshots[brand]) cachedSnapshots[brand] = getUTMFromURL(brand);
    return cachedSnapshots[brand]!;
  };
}

function getServerSnapshot(): UTMParams {
  // The server can't know window.location.search: render with no UTM
  // during SSR (and during the client's very first hydration pass) so the
  // markup matches exactly, then resync to the real value right after.
  return SERVER_SNAPSHOT;
}

/**
 * `brand` ("dog" | "cat", default "dog") selects the fixed utm_source the
 * hub stamps on its own links — see src/lib/utm.ts and src/lib/brand.ts.
 */
export function useUTM(brand: string = "dog"): UTMParams {
  return useSyncExternalStore(subscribe, makeGetSnapshot(brand), getServerSnapshot);
}
