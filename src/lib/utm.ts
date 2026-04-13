const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export type UTMParams = Partial<Record<(typeof UTM_PARAMS)[number], string>>;

export function getUTMFromURL(): UTMParams {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utm: UTMParams = {};
  for (const key of UTM_PARAMS) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  return utm;
}

export function appendUTM(url: string, utm: UTMParams): string {
  const parsed = new URL(url);
  for (const [key, val] of Object.entries(utm)) {
    if (val) parsed.searchParams.set(key, val);
  }
  return parsed.toString();
}
