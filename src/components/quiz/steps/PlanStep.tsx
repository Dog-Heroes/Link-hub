"use client";

import { useQuiz, type DogData, type HealthData } from "../QuizContext";
import type { QuizOptions } from "@/lib/quiz-options";
import DogSummaryCard from "../ui/DogSummaryCard";
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
 * Builds the bridge page URL with all dog data as query params, using the
 * EXACT same handles/values the live dogheroes.it quiz sends (see
 * src/lib/quiz-options.ts) — every param is one of the live quiz's own
 * option values, never a translated/guessed one, so the bridge
 * (Dog-Heroes/dogheroes-theme PR #302) never silently discards a field.
 */
function buildBridgeUrl(dog: DogData, health: HealthData): string {
  const params = new URLSearchParams();

  params.set("name", dog.name.trim());
  params.set("breed", dog.breed);
  params.set("sex", dog.gender);
  params.set("birthday", approximateBirthday(dog.ageYears, dog.ageMonths));
  params.set("weight", dog.weight);
  if (dog.bodyCondition) params.set("build", dog.bodyCondition);
  if (health.activity) params.set("activity", health.activity);
  params.set("sterilization", health.neutered);
  params.set("hunger", health.hunger);

  if (health.diet.length) params.set("diet", health.diet.join(","));

  // "nessuna" is itself a valid handle on the site (the "no allergy"
  // checkbox is checked by default and still submitted) — mirror that
  // instead of omitting the param.
  params.set(
    "allergies",
    health.allergies.length ? health.allergies.join(",") : "nessuna"
  );

  params.set("has_diseases", health.hasDiseases);
  if (health.hasDiseases === "yes" && health.healthIssues.length) {
    params.set("diseases", health.healthIssues.join(","));
  }

  params.set("bridge", "1");
  return `${quizData.submitUrl}?${params.toString()}`;
}

function isQuizValid(dog: DogData, health: HealthData, options: QuizOptions | null): boolean {
  if (!options) return false;
  if (!dog.name.trim()) return false;
  if (!dog.breed) return false;
  if (!dog.weight || Number(dog.weight) <= 0) return false;
  if (!health.hunger) return false;
  if (health.diet.length === 0) return false;
  if (health.hasDiseases === "yes" && health.healthIssues.length === 0) return false;
  return true;
}

export default function PlanStep() {
  const { state } = useQuiz();
  const { dog, health, options } = state;
  const utm = useUTM();

  const isValid = isQuizValid(dog, health, options);

  function handleSubmit() {
    if (!isValid) return;

    trackEvent("quiz_widget_redirect", {
      dog_name: dog.name,
      dog_breed: dog.breed,
      dog_weight: dog.weight,
      dog_activity: health.activity,
    });

    const url = appendUTM(buildBridgeUrl(dog, health), utm);
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
    </section>
  );
}

export { buildBridgeUrl, isQuizValid, approximateBirthday };
