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
import { buildBridgeUrl, buildCustomerFragment, isQuizValid, getMissingFields, approximateBirthday } from "../src/components/quiz/steps/PlanStep";
import type { DogData, HealthData, CustomerData } from "../src/components/quiz/QuizContext";
import { appendUTM, getFixedUTM } from "../src/lib/utm";

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
    ageYears: "2",
    ageMonths: "3",
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

  // Sample customer data (dati finti) — the optional final step of the
  // mini quiz. These must NEVER leak into the query string: only into the
  // URL fragment (see buildCustomerFragment in PlanStep.tsx).
  const customer: CustomerData = {
    name: "Maria Rossi",
    email: "maria.rossi@example.com",
    phone: "333 1234567",
    zip: "20100",
  };

  const url = buildBridgeUrl(dog, health, customer);
  console.log(`\nSample bridge URL:\n${url}\n`);

  const [urlWithoutFragment, fragment] = url.split("#");
  const params = new URL(urlWithoutFragment).searchParams;

  assert(url.includes("#"), "bridge URL carries a fragment when customer data is filled in");
  assert(!!fragment, "fragment is non-empty when customer data is filled in");

  // PII must NEVER be in the query string — only in the fragment.
  for (const piiKey of ["c_name", "c_email", "c_phone", "c_zip", "name_customer"]) {
    assert(!params.has(piiKey), `query string never carries ${piiKey}`);
  }
  assert(!urlWithoutFragment.includes(encodeURIComponent(customer.email)), "query string never contains the customer email");
  assert(!urlWithoutFragment.includes(encodeURIComponent(customer.phone.replace(/\s/g, "+"))), "query string never contains the customer phone");

  // The fragment itself, built with URLSearchParams, carries exactly the
  // four contact fields the contract with the bridge (dogheroes-theme PR
  // #302) defines — c_name/c_email/c_phone/c_zip.
  const fragmentParams = new URLSearchParams(fragment);
  assert(fragmentParams.get("c_name") === customer.name, "c_name is in the fragment, unmodified");
  assert(fragmentParams.get("c_email") === customer.email, "c_email is in the fragment, unmodified");
  assert(fragmentParams.get("c_phone") === customer.phone, "c_phone is in the fragment, unmodified");
  assert(fragmentParams.get("c_zip") === customer.zip, "c_zip is in the fragment, unmodified");

  // Dog's own name param ("name") stays in the query string (it's a
  // required field of the dog quiz itself, not a customer field) and is
  // unaffected by the customer fragment.
  assert(params.get("name") === "Fido", "dog's own 'name' query param is untouched by the customer fragment");

  // Empty/partial customer data: no fragment at all, nothing optional
  // blocks the quiz CTA.
  const emptyCustomer: CustomerData = { name: "", email: "", phone: "", zip: "" };
  const urlNoCustomer = buildBridgeUrl(dog, health, emptyCustomer);
  assert(!urlNoCustomer.includes("#"), "no customer data filled in -> no fragment at all");

  // An invalid email is dropped rather than sent through; the other three
  // optional fields are unaffected.
  const partialCustomer: CustomerData = { name: "Maria Rossi", email: "not-an-email", phone: "", zip: "20100" };
  const partialFragment = buildCustomerFragment(partialCustomer);
  const partialParams = new URLSearchParams(partialFragment);
  assert(partialParams.get("c_name") === "Maria Rossi", "c_name is kept even when other fields are empty/invalid");
  assert(!partialParams.has("c_email"), "an obviously invalid email is dropped from the fragment");
  assert(!partialParams.has("c_phone"), "an empty phone is omitted from the fragment");
  assert(partialParams.get("c_zip") === "20100", "c_zip is kept");

  assert(url.startsWith("https://www.dogheroes.it/pages/quiz?"), "submitUrl points at dogheroes.it, not the myshopify domain");
  assert(params.get("bridge") === "1", "bridge=1 is set");
  assert(params.get("name") === "Fido", "name is sent as typed");

  assert(valueSet(options, "breeds").has(params.get("breed") ?? ""), "breed is a valid handle");
  assert(valueSet(options, "sex").has(params.get("sex") ?? ""), "sex is a valid value");
  assert(valueSet(options, "sterilization").has(params.get("sterilization") ?? ""), "sterilization is a valid value");
  assert(valueSet(options, "bodyConditions").has(params.get("build") ?? ""), "build is a valid handle");
  assert(valueSet(options, "activityLevels").has(params.get("activity") ?? ""), "activity is a valid handle");
  assert(valueSet(options, "hungerLevels").has(params.get("hunger") ?? ""), "hunger is present and a valid handle");

  // The bridge on the theme (Dog-Heroes/dogheroes-theme PR #302) stops the
  // user on that step if a field is missing from the URL at all, not just
  // if its value is invalid — so these must always be present, even when a
  // default value already covers them.
  for (const key of ["build", "activity", "allergies", "has_diseases", "sterilization", "hunger", "sex", "breed", "diet", "weight", "birthday"]) {
    assert(params.has(key), `${key} is always present in the URL (never omitted)`);
  }

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

  // The quiz bridge link (PlanStep.tsx) always stamps the hub's fixed
  // UTM — utm_source=linktree&utm_medium=bio, never overridden by whatever
  // UTM the hub URL itself was opened with.
  const noIncomingParams = new URLSearchParams();
  const urlWithUtm = appendUTM(url, getFixedUTM(noIncomingParams));
  const utmParams = new URL(urlWithUtm).searchParams;
  assert(utmParams.get("utm_source") === "linktree", "bridge URL carries utm_source=linktree");
  assert(utmParams.get("utm_medium") === "bio", "bridge URL carries utm_medium=bio");
  assert(utmParams.get("utm_campaign") === null, "no ?s= on the hub URL -> no utm_campaign at all");

  // appendUTM only ever touches the query string: the customer fragment
  // must survive completely untouched, with the exact same c_* values.
  const utmFragment = urlWithUtm.split("#")[1] ?? "";
  assert(utmFragment === fragment, "appendUTM leaves the customer fragment byte-for-byte untouched");

  // ?s=ig / ?s=tt on the hub URL map to a campaign; any incoming
  // utm_source/utm_medium/utm_campaign is ignored (the fixed ones always win).
  const igParams = new URLSearchParams("s=ig&utm_source=newsletter&utm_medium=email&utm_campaign=whatever");
  const igUtm = getFixedUTM(igParams);
  assert(igUtm.utm_source === "linktree", "incoming utm_source never overrides the fixed one");
  assert(igUtm.utm_medium === "bio", "incoming utm_medium never overrides the fixed one");
  assert(igUtm.utm_campaign === "instagram", "?s=ig on the hub URL maps to utm_campaign=instagram");

  const ttUtm = getFixedUTM(new URLSearchParams("s=tt"));
  assert(ttUtm.utm_campaign === "tiktok", "?s=tt on the hub URL maps to utm_campaign=tiktok");

  const unknownSUtm = getFixedUTM(new URLSearchParams("s=fb"));
  assert(unknownSUtm.utm_campaign === undefined, "an unmapped ?s= value sets no utm_campaign");

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

  // Fields the live site itself has NO default for (verified live,
  // 08/10/2026): sesso, sterilizzazione and both age fields. The hub must
  // not preselect any of these — an empty value for any of them keeps the
  // whole quiz invalid, exactly like the site's own "Prosegui" staying
  // disabled.
  assert(!isQuizValid({ ...dog, gender: "" }, health, options), "quiz without sesso (no default on the site either) is rejected");
  assert(!isQuizValid(dog, { ...health, neutered: "" }, options), "quiz without sterilizzazione (no default on the site either) is rejected");
  assert(!isQuizValid({ ...dog, ageYears: "" }, health, options), "quiz without anni (età) is rejected even if mesi is set");
  assert(!isQuizValid({ ...dog, ageMonths: "" }, health, options), "quiz without mesi (età) is rejected even if anni is set");

  // ...but once BOTH age fields are explicitly chosen, "0 anni e 0 mesi" is
  // itself a valid combination — the live site's own age step accepts it
  // (verified live: "Prosegui" enables with both fields at "0"), it is
  // simply never the one shown by default.
  assert(isQuizValid({ ...dog, ageYears: "0", ageMonths: "0" }, health, options), "0 anni + 0 mesi is a VALID age once both are explicitly chosen (matches the site)");

  // getMissingFields names every missing required field, used to tell the
  // user what's left before the CTA is enabled.
  const emptyDog: DogData = { name: "", breed: "", breedLabel: "", gender: "", ageYears: "", ageMonths: "", weight: "", bodyCondition: "ideale" };
  const emptyHealth: HealthData = { neutered: "", activity: "attivo", hunger: "", diet: [], allergies: ["nessuna"], hasDiseases: "no", healthIssues: [] };
  const missing = getMissingFields(emptyDog, emptyHealth, options);
  for (const label of ["Nome", "Razza", "Sesso", "Età", "Peso", "Sterilizzazione", "Appetito", "Dieta"]) {
    assert(missing.includes(label), `getMissingFields reports "${label}" missing on a blank quiz`);
  }
  // Fields the site itself defaults to a visible value are never reported
  // missing just because they're untouched (bodyCondition "ideale",
  // activity "attivo", allergies "nessuna", hasDiseases "no" above).
  assert(getMissingFields(dog, health, options).length === 0, "a fully filled-in quiz (sample dog/health) reports nothing missing");

  console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Test script crashed:", err);
  process.exit(1);
});
