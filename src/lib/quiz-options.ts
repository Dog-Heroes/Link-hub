/**
 * Quiz options — reads the SAME option lists (breeds, activity levels, body
 * condition, appetite, diet, allergies, health issues…) used by the quiz
 * live on the main Shopify theme (https://www.dogheroes.it/pages/quiz),
 * instead of keeping a hardcoded copy in this repo that can silently drift
 * out of sync.
 *
 * Why this matters: the hub's "crea il tuo piano" quiz redirects to a
 * bridge page on the theme (Dog-Heroes/dogheroes-theme PR #302,
 * handleBridge) which validates every value against the site's own quiz
 * options and SILENTLY DISCARDS anything that doesn't match — the customer
 * then gets stuck re-entering that field on-site. Sourcing the options
 * live (with a same-day fallback snapshot) is the only way to guarantee
 * the hub always sends values the bridge accepts, even as breeds/metaobject
 * options change on Shopify.
 *
 * The page embeds the full metaobject-backed data set in a
 * `<meta name="dogheroes:algorithm-data" content="...">` tag (HTML-entity
 * encoded JSON) — we parse that instead of scraping the rendered quiz
 * markup, since it already carries machine-readable handle+label pairs for
 * everything except the two fixed yes/no questions (sex, and the
 * yes/no "has diseases" switch) which aren't metaobject-backed at all.
 */

import fallback from "@/config/quiz-options-fallback.json";

export const QUIZ_PAGE_URL = "https://www.dogheroes.it/pages/quiz";

export interface QuizOption {
  value: string;
  label: string;
  description?: string;
  exclusive?: boolean;
}

export interface QuizBreed {
  value: string;
  label: string;
}

export interface WeightLimits {
  min: number;
  max: number;
  step: number;
}

export interface QuizOptions {
  breeds: QuizBreed[];
  sex: QuizOption[];
  sterilization: QuizOption[];
  bodyConditions: QuizOption[];
  activityLevels: QuizOption[];
  hungerLevels: QuizOption[];
  diets: QuizOption[];
  allergies: QuizOption[];
  healthIssues: QuizOption[];
  weight: WeightLimits;
}

/* ------------------------------------------------------------------ */
/*  Raw shape of window.DogHeroes's algorithm data (meta tag)          */
/* ------------------------------------------------------------------ */

interface AlgorithmFactorItem {
  handle: string;
  key?: string;
  label: string;
  value?: string;
  description?: string | null;
  deprecated?: boolean | null;
  position?: number;
}

interface AlgorithmBreed {
  handle: string;
  name: string;
}

interface AlgorithmData {
  dog_breeds: AlgorithmBreed[];
  activity_factor: AlgorithmFactorItem[];
  sterilization_factor: AlgorithmFactorItem[];
  body_condition_factor: AlgorithmFactorItem[];
  hungry_factor: AlgorithmFactorItem[];
  diet_category: AlgorithmFactorItem[];
  protein_category: AlgorithmFactorItem[];
  health_problem: AlgorithmFactorItem[];
}

const ALGORITHM_DATA_RE =
  /<meta\s+name="dogheroes:algorithm-data"\s+content="([^"]*)"/;

// The weight <input> on the quiz page (data-weight-validation-target
// carries min/max/step); fall back to the last known-good values if the
// markup changes shape.
const WEIGHT_INPUT_RE = /data-weight-validation-target="weight"[\s\S]{0,600}?(?:\/?>)/;
const WEIGHT_MIN_RE = /\bmin="([^"]+)"/;
const WEIGHT_MAX_RE = /\bmax="([^"]+)"/;
const WEIGHT_STEP_RE = /\bstep="([^"]+)"/;
const DEFAULT_WEIGHT: WeightLimits = { min: 0, max: 200, step: 0.1 };

// Fixed binary questions the quiz template hardcodes as plain radios
// (Maschio/Femmina) rather than sourcing from a metaobject list.
const SEX_OPTIONS: QuizOption[] = [
  { value: "male", label: "Maschio" },
  { value: "female", label: "Femmina" },
];

const ALLERGY_EXCLUSIVE_HANDLE = "nessuna";

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function parseAlgorithmData(html: string): AlgorithmData {
  const match = html.match(ALGORITHM_DATA_RE);
  if (!match) throw new Error("dogheroes:algorithm-data meta tag not found");
  return JSON.parse(decodeHtmlEntities(match[1])) as AlgorithmData;
}

export function parseWeightLimits(html: string): WeightLimits {
  const block = html.match(WEIGHT_INPUT_RE)?.[0] ?? "";
  const min = Number(block.match(WEIGHT_MIN_RE)?.[1]);
  const max = Number(block.match(WEIGHT_MAX_RE)?.[1]);
  const step = Number(block.match(WEIGHT_STEP_RE)?.[1]);
  return {
    min: Number.isFinite(min) ? min : DEFAULT_WEIGHT.min,
    max: Number.isFinite(max) ? max : DEFAULT_WEIGHT.max,
    step: Number.isFinite(step) && step > 0 ? step : DEFAULT_WEIGHT.step,
  };
}

function toOptions(items: AlgorithmFactorItem[]): QuizOption[] {
  return items
    .filter((item) => !item.deprecated)
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((item) => ({
      value: item.handle,
      label: item.label,
      ...(item.description ? { description: item.description } : {}),
    }));
}

export function buildQuizOptions(
  data: AlgorithmData,
  weight: WeightLimits
): QuizOptions {
  return {
    breeds: data.dog_breeds
      .map((b) => ({ value: b.handle, label: b.name }))
      .sort((a, b) => a.label.localeCompare(b.label, "it")),
    sex: SEX_OPTIONS,
    sterilization: toOptions(data.sterilization_factor),
    bodyConditions: toOptions(data.body_condition_factor),
    activityLevels: toOptions(data.activity_factor),
    hungerLevels: toOptions(data.hungry_factor),
    diets: toOptions(data.diet_category),
    allergies: toOptions(data.protein_category).map((option) =>
      option.value === ALLERGY_EXCLUSIVE_HANDLE
        ? { ...option, exclusive: true }
        : option
    ),
    healthIssues: toOptions(data.health_problem),
    weight,
  };
}

/**
 * Fetches and parses the live quiz page from dogheroes.it. Exported
 * separately so the fallback-snapshot generator script
 * (scripts/generate-quiz-options-fallback.ts) can reuse the exact same
 * parsing logic used at request time — getQuizOptions() below is what the
 * rest of the app should call.
 */
export async function fetchQuizOptionsFromLiveSite(): Promise<QuizOptions> {
  const res = await fetch(QUIZ_PAGE_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`quiz page fetch ${res.status}`);

  const html = await res.text();
  const data = parseAlgorithmData(html);
  const weight = parseWeightLimits(html);
  return buildQuizOptions(data, weight);
}

/**
 * Returns the quiz options that drive the hub's "crea il tuo piano" quiz:
 * the live dogheroes.it data set when reachable, otherwise the bundled
 * same-day snapshot (src/config/quiz-options-fallback.json) so the quiz
 * never breaks when the site is unreachable or its markup changes shape.
 */
export async function getQuizOptions(): Promise<QuizOptions> {
  try {
    return await fetchQuizOptionsFromLiveSite();
  } catch {
    return fallback as QuizOptions;
  }
}
