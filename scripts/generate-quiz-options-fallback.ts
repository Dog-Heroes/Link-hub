/**
 * Generates the same-day fallback snapshot for the quiz options
 * (src/config/quiz-options-fallback.json), used by getQuizOptions()
 * (src/lib/quiz-options.ts) whenever the live dogheroes.it quiz page is
 * unreachable or its markup changes shape.
 *
 * Re-run this whenever the live site's quiz data changes meaningfully
 * (new breeds, new allergy/health-issue metaobjects, etc.) so the fallback
 * doesn't drift too far from reality:
 *
 *   npx tsx scripts/generate-quiz-options-fallback.ts
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  QUIZ_PAGE_URL,
  buildQuizOptions,
  parseAlgorithmData,
  parseWeightLimits,
} from "../src/lib/quiz-options";

async function main() {
  console.log(`Fetching ${QUIZ_PAGE_URL} ...`);
  const res = await fetch(QUIZ_PAGE_URL, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`quiz page fetch ${res.status}`);

  const html = await res.text();
  const data = parseAlgorithmData(html);
  const weight = parseWeightLimits(html);
  const options = buildQuizOptions(data, weight);

  const outPath = join(__dirname, "../src/config/quiz-options-fallback.json");
  writeFileSync(outPath, JSON.stringify(options, null, 2) + "\n", "utf-8");

  console.log(`Saved ${outPath}`);
  console.log(
    `  breeds: ${options.breeds.length}, sterilization: ${options.sterilization.length}, ` +
      `bodyConditions: ${options.bodyConditions.length}, activityLevels: ${options.activityLevels.length}, ` +
      `hungerLevels: ${options.hungerLevels.length}, diets: ${options.diets.length}, ` +
      `allergies: ${options.allergies.length}, healthIssues: ${options.healthIssues.length}`
  );
}

main().catch((err) => {
  console.error("Failed to generate quiz options fallback:", err);
  process.exit(1);
});
