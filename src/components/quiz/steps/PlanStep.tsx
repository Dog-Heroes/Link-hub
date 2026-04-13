"use client";

import { useQuiz } from "../QuizContext";
import DogSummaryCard from "../ui/DogSummaryCard";
import { useUTM } from "@/hooks/useUTM";
import { appendUTM } from "@/lib/utm";
import { trackEvent } from "@/lib/analytics";
import quizData from "@/config/quiz.json";

function mapGender(gender: string): string {
  return gender === "Femminuccia" ? "female" : "male";
}

function mapBodyCondition(condition: string): string {
  // Labels in widget match Shopify keys directly
  return condition.toLowerCase();
}

function mapActivity(activity: string): string {
  const map: Record<string, string> = {
    Sedentario: "sedentario",
    Attivo: "attivo",
    "Molto attivo": "molto_attivo",
  };
  return map[activity] || activity.toLowerCase();
}

function mapNeutered(neutered: string): string {
  return neutered === "Sì" ? "yes" : "no";
}

function generateBirthday(ageYears: number, ageMonths: number): string {
  const now = new Date();
  now.setFullYear(now.getFullYear() - ageYears);
  now.setMonth(now.getMonth() - ageMonths);
  return now.toISOString().split("T")[0];
}

/**
 * Builds the bridge page URL with all dog data as query params.
 * The bridge page on Shopify will read these, write to localStorage,
 * and redirect to the quiz at the customer-data step.
 */
function buildBridgeUrl(
  dog: ReturnType<typeof useQuiz>["state"]["dog"],
  health: ReturnType<typeof useQuiz>["state"]["health"]
): string {
  const params = new URLSearchParams();

  params.set("name", dog.name);
  params.set("breed", dog.breed);
  params.set("sex", mapGender(dog.gender));
  params.set("birthday", generateBirthday(dog.ageYears, dog.ageMonths));
  params.set("weight", dog.weight);
  if (dog.bodyCondition) params.set("build", mapBodyCondition(dog.bodyCondition));
  if (health.activity) params.set("activity", mapActivity(health.activity));
  params.set("sterilization", mapNeutered(health.neutered));

  if (health.diet) params.set("diet", health.diet.toLowerCase());

  const allergies = health.allergies.filter((a) => a.toLowerCase() !== "nessuna");
  if (allergies.length) params.set("allergies", allergies.join(","));

  const diseases = health.healthIssues.filter((h) => h.toLowerCase() !== "nessuno");
  params.set("has_diseases", diseases.length > 0 ? "yes" : "no");
  if (diseases.length) params.set("diseases", diseases.join(","));

  params.set("bridge", "1");
  return `${quizData.submitUrl}?${params.toString()}`;
}

export default function PlanStep() {
  const { state } = useQuiz();
  const { dog, health } = state;
  const utm = useUTM();

  const isValid = dog.name.trim() && dog.breed;

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
