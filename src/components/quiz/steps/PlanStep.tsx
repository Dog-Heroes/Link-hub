"use client";

import { useQuiz, type DogData, type HealthData, type CustomerData } from "../QuizContext";
import type { QuizOptions } from "@/lib/quiz-options";
import DogSummaryCard from "../ui/DogSummaryCard";
import FormField from "../ui/FormField";
import { useUTM } from "@/hooks/useUTM";
import { appendUTM } from "@/lib/utm";
import { trackEvent } from "@/lib/analytics";
import quizData from "@/config/quiz.json";

/**
 * Approximate birthday from the years/months the user picked, as "YYYY-MM"
 * (no day — we only know an approximate age, so inventing a day-of-month
 * would be misleading). The bridge page on the theme
 * (Dog-Heroes/dogheroes-theme PR #302, handleBridge) accepts both
 * "YYYY-MM" and "YYYY-MM-DD" and stores it as approximate.
 */
function approximateBirthday(ageYears: number, ageMonths: number): string {
  const now = new Date();
  let year = now.getFullYear() - ageYears;
  let month = now.getMonth() + 1 - ageMonths; // 1-indexed month
  if (month <= 0) {
    year -= 1;
    month += 12;
  }
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}`;
}

/**
 * Builds the URL fragment (never the query string) carrying the optional
 * contact details from the hub's own final step — c_name/c_email/c_phone/
 * c_zip, URLSearchParams-encoded. Fixed contract with the bridge
 * (Dog-Heroes/dogheroes-theme PR #302, implemented there in parallel): PII
 * only ever travels in the fragment, which browsers never send to the
 * server, never log, and never forward as a referrer — unlike the query
 * string, which GA4/server logs/the discount-redirect hop on Shopify can
 * all see. Every field is optional: an empty/invalid one is simply left
 * out, it never blocks the quiz CTA (see isQuizValid, unaffected by this).
 */
function buildCustomerFragment(customer: CustomerData): string {
  const params = new URLSearchParams();

  const name = customer.name.trim();
  const email = customer.email.trim();
  const phone = customer.phone.trim();
  const zip = customer.zip.trim();

  if (name) params.set("c_name", name);
  // Loose sanity check only (not the site's own validation) — an obviously
  // non-email string is just dropped rather than sent through.
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) params.set("c_email", email);
  if (phone) params.set("c_phone", phone);
  if (zip) params.set("c_zip", zip);

  return params.toString();
}

/**
 * Builds the bridge page URL with all dog data as query params, using the
 * EXACT same handles/values the live dogheroes.it quiz sends (see
 * src/lib/quiz-options.ts) — every param is one of the live quiz's own
 * option values, never a translated/guessed one, so the bridge
 * (Dog-Heroes/dogheroes-theme PR #302) never silently discards a field.
 *
 * Contact details (name/email/phone/CAP), when the user filled them in on
 * the hub's own final step, are appended as a URL FRAGMENT after the query
 * string (`...#c_name=...&c_email=...`), never as extra query params — see
 * {@link buildCustomerFragment}. appendUTM (src/lib/utm.ts) only ever
 * touches the query string, so the fragment always survives untouched,
 * including through the one Shopify redirect this URL can hit
 * (`/discount/CODE?redirect=...` — verified with a live 302: the fragment
 * carries over to the final `/pages/quiz` URL, scripts/test-bridge-url.ts).
 */
function buildBridgeUrl(dog: DogData, health: HealthData, customer: CustomerData): string {
  const params = new URLSearchParams();

  // Every field is sent explicitly, even when a default already covers it
  // (build, activity, allergies, has_diseases) — the bridge on the theme
  // (Dog-Heroes/dogheroes-theme PR #302) stops the user on that step of
  // the on-site quiz for any field missing from the URL, not just for an
  // invalid value.
  params.set("name", dog.name.trim());
  params.set("breed", dog.breed);
  params.set("sex", dog.gender);
  // isQuizValid guarantees both are a chosen, non-empty value (even "0" is
  // valid, see DogData.ageYears/ageMonths) before this is ever called.
  params.set("birthday", approximateBirthday(Number(dog.ageYears), Number(dog.ageMonths)));
  params.set("weight", dog.weight);
  params.set("build", dog.bodyCondition);
  params.set("activity", health.activity);
  params.set("sterilization", health.neutered);
  params.set("hunger", health.hunger);
  params.set("diet", health.diet.join(","));

  // "nessuna" is itself a valid handle on the site (the "no allergy"
  // checkbox is checked by default and still submitted) — mirror that
  // instead of omitting the param.
  params.set(
    "allergies",
    health.allergies.length ? health.allergies.join(",") : "nessuna"
  );

  params.set("has_diseases", health.hasDiseases);
  if (health.hasDiseases === "yes") {
    params.set("diseases", health.healthIssues.join(","));
  }

  params.set("bridge", "1");

  const query = params.toString();
  const fragment = buildCustomerFragment(customer);
  return fragment ? `${quizData.submitUrl}?${query}#${fragment}` : `${quizData.submitUrl}?${query}`;
}

/**
 * Required fields, aligned 1:1 with what the live quiz on dogheroes.it
 * itself requires (verified live, 08/10/2026 — each one blocks "Prosegui"
 * there until chosen, with no default): name, breed, sex, BOTH age
 * fields (0 is a valid choice once picked — the site accepts "0 anni + 0
 * mesi" — but neither starts pre-filled), weight, sterilization, hunger,
 * diet (at least one), and the disease list when "Ha esigenze di salute"
 * is "sì". Fields the site itself defaults to a visible value — body
 * condition "ideale", activity "attivo", allergies "nessuna", has_diseases
 * "no" — are intentionally NOT required here either: the hub mirrors the
 * same defaults, so leaving them untouched is the same as on the site.
 */
function isQuizValid(dog: DogData, health: HealthData, options: QuizOptions | null): boolean {
  return getMissingFields(dog, health, options).length === 0;
}

/** Italian labels for whatever required field above is still missing — shown
 * near the CTA so a disabled button always says why. */
function getMissingFields(dog: DogData, health: HealthData, options: QuizOptions | null): string[] {
  if (!options) return [];
  const missing: string[] = [];
  if (!dog.name.trim()) missing.push("Nome");
  if (!dog.breed) missing.push("Razza");
  if (!dog.gender) missing.push("Sesso");
  if (dog.ageYears === "" || dog.ageMonths === "") missing.push("Età");
  if (!dog.weight || Number(dog.weight) <= 0) missing.push("Peso");
  if (!health.neutered) missing.push("Sterilizzazione");
  if (!health.hunger) missing.push("Appetito");
  if (health.diet.length === 0) missing.push("Dieta");
  if (health.hasDiseases === "yes" && health.healthIssues.length === 0) missing.push("Patologie");
  return missing;
}

export default function PlanStep() {
  const { state, dispatch } = useQuiz();
  const { dog, health, customer, options } = state;
  const utm = useUTM();

  const missingFields = getMissingFields(dog, health, options);
  const isValid = missingFields.length === 0;

  function setCustomer<K extends keyof CustomerData>(field: K, value: CustomerData[K]) {
    dispatch({ type: "SET_CUSTOMER", field, value });
  }

  function handleSubmit() {
    if (!isValid) return;

    // Never include customer/contact fields here: trackEvent (src/lib/
    // analytics.ts) only forwards link_id to /api/track anyway, but this
    // stays explicit so no future refactor of analytics.ts can leak PII.
    trackEvent("quiz_widget_redirect", {
      dog_name: dog.name,
      dog_breed: dog.breed,
      dog_weight: dog.weight,
      dog_activity: health.activity,
    });

    const url = appendUTM(buildBridgeUrl(dog, health, customer), utm);
    window.location.href = url;
  }

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-[12px] font-extrabold uppercase tracking-[0.15em] text-[#002B49]/40">
        Il tuo piano
      </h2>

      <DogSummaryCard />

      {/* Discount Banner */}
      <div className="bg-[#002B49]/5 rounded-2xl py-3 px-4 text-center">
        <span className="text-[13px] font-bold text-[#002B49]">
          ASSICURATI IL{" "}
          <span className="inline-flex items-center justify-center bg-[#E1251B] text-white text-[12px] font-extrabold rounded-full px-2.5 py-0.5 mx-1">
            -{quizData.discountPercent}%
          </span>
          {" "}DI SCONTO SULLA PRIMA BOX
        </span>
      </div>

      {/* Info box */}
      <div className="bg-[#E1251B]/5 rounded-2xl py-4 px-4">
        <p className="text-[13px] text-[#002B49]/70 text-center leading-relaxed">
          Completeremo il tuo piano personalizzato sul sito Dog Heroes,
          dove potrai inserire i tuoi dati e scoprire le ricette perfette per{" "}
          <strong className="text-[#002B49]">{dog.name || "il tuo cane"}</strong>.
        </p>
      </div>

      {/* Dati di contatto — facoltativi: NON raccolgono il consenso
          marketing/privacy (lo dà l'utente sul sito), e NON vengono salvati
          nel DB del hub né inviati al suo analytics (trackEvent sopra non
          li include). Se compilati, viaggiano SOLO nel fragment dell'URL
          del bridge (buildBridgeUrl → buildCustomerFragment), mai nella
          query string. */}
      <div className="flex flex-col gap-4">
        <h3 className="text-[12px] font-extrabold uppercase tracking-[0.15em] text-[#002B49]/40">
          I tuoi dati (facoltativo)
        </h3>

        <FormField label="Nome e cognome" htmlFor="customer-name">
          <input
            id="customer-name"
            type="text"
            autoComplete="name"
            value={customer.name}
            onChange={(e) => setCustomer("name", e.target.value)}
            placeholder="Es. Maria Rossi"
            className="w-full px-4 py-3 rounded-xl border-2 border-[#002B49]/10 text-[14px] text-[#002B49] placeholder:text-[#002B49]/30 focus:border-[#E1251B]/50 focus:outline-none transition-colors min-h-[44px]"
          />
        </FormField>

        <FormField label="Email" htmlFor="customer-email">
          <input
            id="customer-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={customer.email}
            onChange={(e) => setCustomer("email", e.target.value)}
            placeholder="nome@esempio.it"
            className="w-full px-4 py-3 rounded-xl border-2 border-[#002B49]/10 text-[14px] text-[#002B49] placeholder:text-[#002B49]/30 focus:border-[#E1251B]/50 focus:outline-none transition-colors min-h-[44px]"
          />
        </FormField>

        <div className="flex gap-3">
          <div className="flex-[3]">
            <FormField label="Telefono" htmlFor="customer-phone">
              <input
                id="customer-phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={customer.phone}
                onChange={(e) => setCustomer("phone", e.target.value)}
                placeholder="333 1234567"
                className="w-full px-4 py-3 rounded-xl border-2 border-[#002B49]/10 text-[14px] text-[#002B49] placeholder:text-[#002B49]/30 focus:border-[#E1251B]/50 focus:outline-none transition-colors min-h-[44px]"
              />
            </FormField>
          </div>
          <div className="flex-[2]">
            <FormField label="CAP" htmlFor="customer-zip">
              <input
                id="customer-zip"
                type="text"
                autoComplete="postal-code"
                inputMode="numeric"
                maxLength={5}
                value={customer.zip}
                onChange={(e) => setCustomer("zip", e.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
                placeholder="20100"
                className="w-full px-4 py-3 rounded-xl border-2 border-[#002B49]/10 text-[14px] text-[#002B49] placeholder:text-[#002B49]/30 focus:border-[#E1251B]/50 focus:outline-none transition-colors min-h-[44px]"
              />
            </FormField>
          </div>
        </div>

        <p className="text-[11px] text-[#002B49]/50 leading-relaxed">
          Confermerai i dati e il consenso sul sito Dog Heroes.
        </p>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid}
        className={`
          w-full py-4 rounded-2xl text-[16px] font-extrabold text-center uppercase tracking-wide
          min-h-[44px] transition-all active:scale-[0.97]
          shadow-[0_4px_16px_rgba(225,37,27,0.3)]
          ${
            isValid
              ? "bg-[#E1251B] text-white hover:bg-[#C41E16]"
              : "bg-[#E1251B]/40 text-white/70 cursor-not-allowed shadow-none"
          }
        `}
      >
        Scopri le ricette per {dog.name || "il tuo cane"}
      </button>

      {!isValid && missingFields.length > 0 && (
        <p className="text-[12px] text-[#E1251B] text-center -mt-2">
          Manca: {missingFields.join(", ")}
        </p>
      )}
    </section>
  );
}

export { buildBridgeUrl, buildCustomerFragment, isQuizValid, getMissingFields, approximateBirthday };
