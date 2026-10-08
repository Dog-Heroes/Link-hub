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
// it's computed once and cached here.
let cachedSnapshot: UTMParams | null = null;
function getSnapshot(): UTMParams {
  if (!cachedSnapshot) cachedSnapshot = getUTMFromURL();
  return cachedSnapshot;
}

function getServerSnapshot(): UTMParams {
  // The server can't know window.location.search: render with no UTM
  // during SSR (and during the client's very first hydration pass) so the
  // markup matches exactly, then resync to the real value right after.
  return SERVER_SNAPSHOT;
}

export function useUTM(): UTMParams {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
