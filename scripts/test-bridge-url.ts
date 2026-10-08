/**
 * Builds a bridge URL from a sample dog (exactly like PlanStep.tsx does)
 * and checks that every value sent is one the live dogheroes.it quiz
 * itself accepts, i.e. that the hub's quiz can never send a value the
 * bridge (Dog-Heroes/dogheroes-theme PR #302, handleBridge) would
 * silently discard.
 *
 * Not a full test-runner suite (none is configured in this project yet —
 * see package.json) — a standalone script that exits non-zero on failure,
 * runnable in CI the same way:
 *
 *   npx tsx scripts/test-bridge-url.ts
 */

import { getQuizOptions, type QuizOptions } from "../src/lib/quiz-options";
import { buildBridgeUrl, isQuizValid, approximateBirthday } from "../src/components/quiz/steps/PlanStep";
import type { DogData, HealthData } from "../src/components/quiz/QuizContext";

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failures++;
    console.error(`✗ ${message}`);
  } else {
    console.log(`✓ ${message}`);
  }
}

function valueSet(options: QuizOptions, key: keyof QuizOptions): Set<string> {
  const list = options[key] as { value: string }[];
  return new Set(list.map((o) => o.value));
}

async function main() {
  const options = await getQuizOptions();

  assert(options.breeds.length > 0, "quiz options carry at least one breed");
  assert(options.hungerLevels.length > 0, "quiz options carry at least one hunger level");

  // Pick real values straight out of the live/fallback options, the same
  // way a user interacting with the widget would.
  const breed = options.breeds[0];
  const bodyCondition = options.bodyConditions[0];
  const activity = options.activityLevels[0];
  const hunger = options.hungerLevels[0];
  const diets = options.diets.slice(0, 2);
  const allergy = options.allergies.find((a) => !a.exclusive) ?? options.allergies[0];
  const healthIssue = options.healthIssues[0];

  const dog: DogData = {
    name: "Fido",
    breed: breed.value,
    breedLabel: breed.label,
    gender: "female",
    ageYears: 2,
    ageMonths: 3,
    weight: "12.5",
    bodyCondition: bodyCondition.value,
  };

  const health: HealthData = {
    neutered: "yes",
    activity: activity.value,
    hunger: hunger.value,
    diet: diets.map((d) => d.value),
    allergies: [allergy.value],
    hasDiseases: "yes",
    healthIssues: [healthIssue.value],
  };

  assert(isQuizValid(dog, health, options), "sample dog passes the hub's own required-field check");

  const url = buildBridgeUrl(dog, health);
  console.log(`\nSample bridge URL:\n${url}\n`);

  const params = new URL(url).searchParams;

  assert(url.startsWith("https://www.dogheroes.it/pages/quiz?"), "submitUrl points at dogheroes.it, not the myshopify domain");
  assert(params.get("bridge") === "1", "bridge=1 is set");
  assert(params.get("name") === "Fido", "name is sent as typed");

  assert(valueSet(options, "breeds").has(params.get("breed") ?? ""), "breed is a valid handle");
  assert(valueSet(options, "sex").has(params.get("sex") ?? ""), "sex is a valid value");
  assert(valueSet(options, "sterilization").has(params.get("sterilization") ?? ""), "sterilization is a valid value");
  assert(valueSet(options, "bodyConditions").has(params.get("build") ?? ""), "build is a valid handle");
  assert(valueSet(options, "activityLevels").has(params.get("activity") ?? ""), "activity is a valid handle");
  assert(valueSet(options, "hungerLevels").has(params.get("hunger") ?? ""), "hunger is present and a valid handle");

  const dietValues = valueSet(options, "diets");
  const sentDiets = (params.get("diet") ?? "").split(",").filter(Boolean);
  assert(sentDiets.length > 0, "diet is sent");
  assert(sentDiets.every((d) => dietValues.has(d)), "every diet value is a valid handle");

  const allergyValues = valueSet(options, "allergies");
  const sentAllergies = (params.get("allergies") ?? "").split(",").filter(Boolean);
  assert(sentAllergies.length > 0, "allergies is sent (even when 'nessuna')");
  assert(sentAllergies.every((a) => allergyValues.has(a)), "every allergy value is a valid handle");

  assert(["yes", "no"].includes(params.get("has_diseases") ?? ""), "has_diseases is yes|no");
  const diseaseValues = valueSet(options, "healthIssues");
  const sentDiseases = (params.get("diseases") ?? "").split(",").filter(Boolean);
  assert(sentDiseases.every((d) => diseaseValues.has(d)), "every disease value is a valid handle");

  assert(/^\d{4}-\d{2}(-\d{2})?$/.test(params.get("birthday") ?? ""), "birthday matches YYYY-MM or YYYY-MM-DD");
  assert(approximateBirthday(0, 0).length === 7, "approximateBirthday never invents a day for a 0y0m dog");

  const weight = Number(params.get("weight"));
  assert(
    Number.isFinite(weight) && weight >= options.weight.min && weight <= options.weight.max,
    "weight is within the live site's own min/max"
  );

  // A dog missing a required field (no breed selected) must stay invalid.
  assert(!isQuizValid({ ...dog, breed: "" }, health, options), "quiz without a breed is rejected by isQuizValid");
  assert(
    !isQuizValid(dog, { ...health, hunger: "" }, options),
    "quiz without hunger (fame) is rejected by isQuizValid"
  );
  assert(
    !isQuizValid(dog, { ...health, hasDiseases: "yes", healthIssues: [] }, options),
    "has_diseases=yes with no disease selected is rejected by isQuizValid"
  );

  console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Test script crashed:", err);
  process.exit(1);
});
