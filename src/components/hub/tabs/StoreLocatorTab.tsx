"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { trackEvent } from "@/lib/analytics";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StoreLocation {
  id: string;
  name: string;
  type: string;
  chain: string;
  address: string;
  city: string;
  zip: string;
  lat: number;
  lng: number;
  phone: string;
  email: string;
  website: string;
  opening_hours: Record<string, string>;
  tags: string[];
  icon: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";

const CHAIN_COLORS: Record<string, string> = {
  Arcaplanet: "#FFD100",
  "Conad Pet Store": "#E87722",
  Finiper: "#E87722",
  Giulius: "#F5A623",
  "Isola dei Tesori": "#4CAF50",
};

const PRODUCT_IMAGES: Record<string, string> = {
  Surgelato: "/images/sl-product-surgelato.png",
  Dispensa: "/images/sl-product-dispensa.png",
  Snack: "/images/sl-product-snack.png",
};

const RADIUS_OPTIONS = [25, 50, 75, 100];
const MAX_RESULTS = 20;

/* ------------------------------------------------------------------ */
/*  Haversine distance (km)                                            */
/* ------------------------------------------------------------------ */

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ------------------------------------------------------------------ */
/*  Open/Closed helper                                                 */
/* ------------------------------------------------------------------ */

function getOpenStatus(hours: Record<string, string> | undefined) {
  if (!hours) return { open: false, label: "" };
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dayNames = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];
  const now = new Date();
  const dayKey = days[now.getDay()];
  const todayHours = hours[dayKey];

  if (!todayHours || todayHours === "closed") {
    for (let i = 1; i <= 7; i++) {
      const nextIdx = (now.getDay() + i) % 7;
      const nextH = hours[days[nextIdx]];
      if (nextH && nextH !== "closed") {
        const openTime = nextH.split("-")[0].split(",")[0].trim();
        const dayLabel = i === 1 ? "domani" : dayNames[nextIdx];
        return { open: false, label: `Chiuso · Apre ${dayLabel} ${openTime}` };
      }
    }
    return { open: false, label: "Chiuso" };
  }

  // Handle multiple periods (e.g. "09:00-13:00, 15:00-19:00")
  const periods = todayHours.split(",").map((p) => p.trim());
  const currentMin = now.getHours() * 60 + now.getMinutes();

  for (const period of periods) {
    const [openStr, closeStr] = period.split("-");
    if (!openStr || !closeStr) continue;
    const [oH, oM] = openStr.split(":").map(Number);
    const [cH, cM] = closeStr.split(":").map(Number);
    const openMin = oH * 60 + oM;
    const closeMin = cH * 60 + cM;
    if (currentMin >= openMin && currentMin < closeMin) {
      return { open: true, label: `Aperto · Chiude alle ${closeStr}` };
    }
  }

  // Check if we're before first period
  const firstOpen = periods[0]?.split("-")[0];
  if (firstOpen) {
    const [fH, fM] = firstOpen.split(":").map(Number);
    if (currentMin < fH * 60 + fM) {
      return { open: false, label: `Chiuso · Apre oggi alle ${firstOpen}` };
    }
  }

  // Closed for today, find next opening
  for (let i = 1; i <= 7; i++) {
    const nextIdx = (now.getDay() + i) % 7;
    const nextH = hours[days[nextIdx]];
    if (nextH && nextH !== "closed") {
      const openTime = nextH.split("-")[0].split(",")[0].trim();
      const dayLabel = i === 1 ? "domani" : dayNames[nextIdx];
      return { open: false, label: `Chiuso · Apre ${dayLabel} ${openTime}` };
    }
  }
  return { open: false, label: "Chiuso" };
}

/* ------------------------------------------------------------------ */
/*  Geocode via Google API                                             */
/* ------------------------------------------------------------------ */

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!GOOGLE_MAPS_API_KEY) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=it&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await res.json();
    if (data.results?.[0]?.geometry?.location) {
      return data.results[0].geometry.location;
    }
  } catch {}
  return null;
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border-2 border-[#002B49]/8 p-4 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="h-2 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="w-8 h-8 bg-gray-200 rounded" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-1/3 mt-3" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Store Card                                                         */
/* ------------------------------------------------------------------ */

function StoreCard({
  store,
  onSelect,
  isActive,
}: {
  store: StoreLocation & { _distance?: number };
  onSelect: () => void;
  isActive: boolean;
}) {
  const status = getOpenStatus(store.opening_hours);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`;
  const chainColor = CHAIN_COLORS[store.chain] || "#002B49";

  return (
    <div
      onClick={onSelect}
      className={`
        rounded-2xl overflow-hidden transition-all cursor-pointer
        ${isActive
          ? "shadow-lg ring-2 ring-[#E1251B]/30"
          : "shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-md"
        }
      `}
    >
      {/* Color accent bar */}
      <div className="h-[3px]" style={{ background: chainColor }} />

      <div className="bg-white p-3.5">
        {/* Header: chain + logo */}
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0 flex-1">
            {store.chain && (
              <p
                className="text-[10px] font-extrabold uppercase tracking-[0.12em] mb-0.5"
                style={{ color: chainColor }}
              >
                {store.chain}
              </p>
            )}
            <h3 className="text-[14px] font-bold text-[#002B49] leading-snug">
              {store.name}
            </h3>
            <p className="text-[12px] text-[#002B49]/45 mt-0.5 leading-tight">
              {[store.address, [store.zip, store.city].filter(Boolean).join(" ")]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
          {store.icon && (
            <img
              src={store.icon}
              alt={store.chain}
              className="w-9 h-9 object-contain flex-shrink-0 rounded-lg border border-[#002B49]/8 p-0.5"
              loading="lazy"
            />
          )}
        </div>

        {/* Status + distance row */}
        <div className="flex items-center justify-between mt-2.5">
          {status.label ? (
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  status.open ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span
                className={`text-[11px] font-semibold ${
                  status.open ? "text-green-700" : "text-red-600"
                }`}
              >
                {status.label}
              </span>
            </div>
          ) : <span />}
          {store._distance != null && (
            <span className="text-[11px] font-medium text-[#002B49]/35 tabular-nums">
              {store._distance < 1
                ? `${Math.round(store._distance * 1000)} m`
                : `${store._distance.toFixed(1)} km`}
            </span>
          )}
        </div>

        {/* Tags — horizontal with images */}
        {store.tags?.length > 0 && (
          <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-[#002B49]/6">
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#002B49]/30">
              Assortimento
            </span>
            <div className="flex gap-2">
              {store.tags.map((tag) => (
                <div key={tag} className="flex flex-col items-center gap-0.5">
                  {PRODUCT_IMAGES[tag] && (
                    <img
                      src={PRODUCT_IMAGES[tag]}
                      alt={tag}
                      className="w-7 h-7 object-contain"
                      loading="lazy"
                    />
                  )}
                  <span className="text-[8px] text-[#002B49]/40 uppercase font-bold tracking-wide">
                    {tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              trackEvent("store_directions_click", { store_id: store.id, chain: store.chain });
            }}
            className="
              flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
              bg-[#002B49] text-white text-[12px] font-bold
              active:scale-[0.97] transition-all min-h-[40px]
            "
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.71 11.29l-9-9a1 1 0 00-1.42 0l-9 9a1 1 0 000 1.42l9 9a1 1 0 001.42 0l9-9a1 1 0 000-1.42zM14 14.5V12h-4v3H8v-4a1 1 0 011-1h5V7.5l3.5 3.5-3.5 3.5z" />
            </svg>
            Indicazioni
          </a>
          {store.phone && (
            <a
              href={`tel:${store.phone}`}
              onClick={(e) => {
                e.stopPropagation();
                trackEvent("store_call_click", { store_id: store.id, chain: store.chain });
              }}
              className="
                flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl
                border-2 border-[#002B49]/12 text-[#002B49] text-[12px] font-bold
                active:scale-[0.97] transition-all min-h-[40px]
              "
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
              </svg>
              Chiama
            </a>
          )}
        </div>

        {/* Expandable hours */}
        {isActive && store.opening_hours && (
          <HoursTable hours={store.opening_hours} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hours table                                                        */
/* ------------------------------------------------------------------ */

function HoursTable({ hours }: { hours: Record<string, string> }) {
  const dayLabels: Record<string, string> = {
    mon: "Lun", tue: "Mar", wed: "Mer", thu: "Gio",
    fri: "Ven", sat: "Sab", sun: "Dom",
  };
  const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const todayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date().getDay()];

  return (
    <div className="mt-3 pt-3 border-t border-[#002B49]/8">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#002B49]/40 mb-1.5">
        Orari di apertura
      </p>
      <div className="space-y-0.5">
        {dayKeys.map((key) => {
          const val = hours[key] || "";
          const display = val === "closed" ? "Chiuso" : val.replace(/-/g, " – ") || "–";
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={`flex justify-between text-[11px] py-0.5 px-1 rounded ${
                isToday ? "bg-[#002B49]/5 font-bold text-[#002B49]" : "text-[#002B49]/60"
              }`}
            >
              <span>{dayLabels[key]}</span>
              <span>{display}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chain filter pill                                                   */
/* ------------------------------------------------------------------ */

function ChainPill({
  chain,
  active,
  onToggle,
  icon,
}: {
  chain: string;
  active: boolean;
  onToggle: () => void;
  icon?: string;
}) {
  const color = CHAIN_COLORS[chain] || "#888";
  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-full
        text-[10px] font-bold whitespace-nowrap
        border-[1.5px] transition-all min-h-[30px]
        ${active
          ? "shadow-sm bg-white"
          : "border-[#002B49]/8 opacity-35 bg-transparent"
        }
      `}
      style={active ? { color, borderColor: color, background: `${color}10` } : undefined}
    >
      {icon && (
        <img src={icon} alt="" className="w-4 h-4 object-contain rounded-sm" loading="lazy" />
      )}
      {chain}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Map component                                                      */
/* ------------------------------------------------------------------ */

function MiniMap({
  stores,
  center,
  activeId,
  onMarkerClick,
}: {
  stores: StoreLocation[];
  center: { lat: number; lng: number } | null;
  activeId: string | null;
  onMarkerClick: (id: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        zoom: 6,
        center: center || { lat: 42.5, lng: 12.5 },
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy",
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      });
    }

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    stores.forEach((s) => {
      const marker = new google.maps.Marker({
        position: { lat: s.lat, lng: s.lng },
        map: mapInstanceRef.current!,
        title: s.name,
        icon: s.icon
          ? {
              url: s.icon,
              scaledSize: new google.maps.Size(28, 28),
              anchor: new google.maps.Point(14, 14),
            }
          : undefined,
      });
      marker.addListener("click", () => onMarkerClick(s.id));
      markersRef.current.push(marker);
      bounds.extend({ lat: s.lat, lng: s.lng });
    });

    if (stores.length > 0) {
      if (center) bounds.extend(center);
      mapInstanceRef.current.fitBounds(bounds);
      if (stores.length === 1) mapInstanceRef.current.setZoom(14);
    }
  }, [stores, center, onMarkerClick]);

  // Pan to active marker
  useEffect(() => {
    if (!activeId || !mapInstanceRef.current) return;
    const store = stores.find((s) => s.id === activeId);
    if (store) {
      mapInstanceRef.current.panTo({ lat: store.lat, lng: store.lng });
      mapInstanceRef.current.setZoom(14);
    }
  }, [activeId, stores]);

  return (
    <div
      ref={mapRef}
      className="w-full h-[250px] rounded-2xl overflow-hidden bg-gray-100"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main StoreLocatorTab                                               */
/* ------------------------------------------------------------------ */

export default function StoreLocatorTab() {
  const [allStores, setAllStores] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Search & filter state
  const [query, setQuery] = useState("");
  const [radius, setRadius] = useState(50);
  const [activeChains, setActiveChains] = useState<Set<string>>(new Set());
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load stores
  useEffect(() => {
    fetch("/api/stores")
      .then((res) => res.json())
      .then((data) => {
        setAllStores(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  // Load Google Maps when map is shown
  useEffect(() => {
    if (!showMap || mapsLoaded || !GOOGLE_MAPS_API_KEY) return;
    if (window.google?.maps) {
      setMapsLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => setMapsLoaded(true);
    document.head.appendChild(script);
  }, [showMap, mapsLoaded]);

  // Get unique chains from data
  const chains = useMemo(() => {
    const chainMap = new Map<string, string>();
    allStores.forEach((s) => {
      if (s.chain && !chainMap.has(s.chain)) {
        chainMap.set(s.chain, s.icon || "");
      }
    });
    return Array.from(chainMap.entries()).map(([name, icon]) => ({ name, icon }));
  }, [allStores]);

  // Filtered & sorted stores
  const filteredStores = useMemo(() => {
    let result = [...allStores];

    // Chain filter
    if (activeChains.size > 0) {
      result = result.filter((s) => activeChains.has(s.chain));
    }

    // Distance filter if we have a center
    if (center) {
      result = result
        .map((s) => ({
          ...s,
          _distance: haversine(center.lat, center.lng, s.lat, s.lng),
        }))
        .filter((s) => s._distance <= radius)
        .sort((a, b) => a._distance - b._distance);
    }

    return result.slice(0, MAX_RESULTS);
  }, [allStores, activeChains, center, radius]);

  const totalCount = useMemo(() => {
    let result = allStores;
    if (activeChains.size > 0) {
      result = result.filter((s) => activeChains.has(s.chain));
    }
    if (center) {
      result = result.filter(
        (s) => haversine(center.lat, center.lng, s.lat, s.lng) <= radius
      );
    }
    return result.length;
  }, [allStores, activeChains, center, radius]);

  // Geocode search
  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      clearTimeout(searchTimeout.current);

      if (!value.trim()) {
        setCenter(null);
        return;
      }

      searchTimeout.current = setTimeout(async () => {
        const coords = await geocode(value);
        if (coords) {
          setCenter(coords);
          trackEvent("store_search", { query: value });
        }
      }, 600);
    },
    []
  );

  // Geolocation
  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setQuery("");
        setGeoLoading(false);
        trackEvent("store_geolocate");
      },
      () => setGeoLoading(false),
      { timeout: 10000 }
    );
  }, []);

  // Toggle chain filter
  const toggleChain = useCallback((chain: string) => {
    setActiveChains((prev) => {
      const next = new Set(prev);
      if (next.has(chain)) next.delete(chain);
      else next.add(chain);
      return next;
    });
  }, []);

  const handleMarkerClick = useCallback((id: string) => {
    setActiveId(id);
    // Scroll card into view
    document.getElementById(`store-card-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, []);

  return (
    <div className="px-4 pt-5 pb-4">
      {/* Section header */}
      <p className="text-[12px] font-extrabold uppercase tracking-[0.15em] text-[#002B49]/40 mb-3">
        Trova il punto vendita
      </p>

      {/* Search bar */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#002B49]/30"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cerca per citta o indirizzo..."
            className="
              w-full pl-9 pr-3 py-2.5 rounded-xl
              border-2 border-[#002B49]/10
              text-[13px] text-[#002B49]
              placeholder:text-[#002B49]/30
              focus:outline-none focus:border-[#E1251B]/40
              transition-colors min-h-[44px]
            "
          />
        </div>
        <button
          onClick={handleGeolocate}
          disabled={geoLoading}
          className="
            flex items-center justify-center w-[44px] h-[44px]
            rounded-xl border-2 border-[#002B49]/10
            text-[#002B49]/60 hover:border-[#002B49]/20
            active:scale-[0.95] transition-all flex-shrink-0
          "
          title="Usa la mia posizione"
        >
          {geoLoading ? (
            <div className="w-4 h-4 border-2 border-[#002B49]/20 border-t-[#E1251B] rounded-full animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
            </svg>
          )}
        </button>
      </div>

      {/* Radius selector */}
      {center && (
        <div className="flex gap-1.5 mb-3">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`
                px-3 py-1 rounded-full text-[11px] font-bold
                border transition-all min-h-[28px]
                ${radius === r
                  ? "bg-[#E1251B] text-white border-[#E1251B]"
                  : "bg-white text-[#002B49]/50 border-[#002B49]/10"
                }
              `}
            >
              {r} km
            </button>
          ))}
        </div>
      )}

      {/* Chain filter pills — wrap on 2 rows */}
      {chains.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-3">
          {chains.map((c) => (
            <ChainPill
              key={c.name}
              chain={c.name}
              icon={c.icon}
              active={activeChains.size === 0 || activeChains.has(c.name)}
              onToggle={() => toggleChain(c.name)}
            />
          ))}
        </div>
      )}

      {/* Map toggle + map */}
      {GOOGLE_MAPS_API_KEY && !loading && filteredStores.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowMap(!showMap)}
            className="
              flex items-center gap-1.5 text-[12px] font-bold
              text-[#002B49]/50 mb-2 min-h-[32px]
            "
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[#E1251B]">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" />
            </svg>
            {showMap ? "Nascondi mappa" : "Mostra mappa"}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              className={`transition-transform ${showMap ? "rotate-180" : ""}`}
            >
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </button>
          {showMap && mapsLoaded && (
            <MiniMap
              stores={filteredStores}
              center={center}
              activeId={activeId}
              onMarkerClick={handleMarkerClick}
            />
          )}
        </div>
      )}

      {/* Results count */}
      {!loading && !error && (
        <p className="text-[11px] text-[#002B49]/40 mb-2">
          {totalCount > MAX_RESULTS
            ? `${totalCount} punti vendita — ${filteredStores.length} visualizzati`
            : `${filteredStores.length} ${filteredStores.length === 1 ? "punto vendita" : "punti vendita"}`}
        </p>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="text-center py-8">
          <p className="text-[14px] text-gray-400">
            Non siamo riusciti a caricare i punti vendita.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-[14px] font-bold text-[#E1251B] min-h-[44px]"
          >
            Riprova
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredStores.length === 0 && (
        <div className="text-center py-8">
          <svg
            className="mx-auto mb-3 text-[#002B49]/15"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          <p className="text-[14px] text-[#002B49]/40">
            Nessun punto vendita trovato
          </p>
          <p className="text-[12px] text-[#002B49]/30 mt-1">
            Prova ad ampliare il raggio di ricerca
          </p>
        </div>
      )}

      {/* Store cards */}
      {!loading && !error && filteredStores.length > 0 && (
        <div className="space-y-2.5">
          {filteredStores.map((store) => (
            <div key={store.id} id={`store-card-${store.id}`}>
              <StoreCard
                store={store}
                isActive={activeId === store.id}
                onSelect={() =>
                  setActiveId(activeId === store.id ? null : store.id)
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
