"use client";

import { useQuiz } from "../QuizContext";
import FormField from "../ui/FormField";
import ToggleSwitch from "../ui/ToggleSwitch";
import ChipSelector from "../ui/ChipSelector";
import quizData from "@/config/quiz.json";

export default function HealthStep() {
  const { state, dispatch } = useQuiz();
  const { health } = state;

  function setHealth(field: string, value: string | string[]) {
    dispatch({ type: "SET_HEALTH", field: field as keyof typeof health, value });
  }

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-[12px] font-extrabold uppercase tracking-[0.15em] text-[#002B49]/40">
        Salute
      </h2>

      {/* Sterilizzato */}
      <FormField label="È sterilizzato/a?">
        <ToggleSwitch
          options={["Sì", "No"]}
          value={health.neutered}
          onChange={(v) => setHealth("neutered", v)}
        />
      </FormField>

      {/* Livello attivita */}
      <FormField label="Livello di attività" htmlFor="activity">
        <div className="flex gap-2 flex-wrap">
          {quizData.activityLevels.map((al) => (
            <button
              key={al.value}
              type="button"
              onClick={() => setHealth("activity", al.label)}
              className={`
                flex-1 min-w-[calc(50%-4px)] py-3 rounded-xl text-[13px] font-bold transition-colors min-h-[44px]
                ${
                  health.activity === al.label
                    ? "bg-[#E1251B] text-white border-2 border-[#E1251B]"
                    : "bg-white text-[#002B49] border-2 border-[#002B49]/10 hover:border-[#E1251B]/30"
                }
              `}
            >
              {al.label}
            </button>
          ))}
        </div>
      </FormField>

      {/* Dieta attuale */}
      <FormField label="Dieta attuale" htmlFor="diet">
        <select
          id="diet"
          value={health.diet}
          onChange={(e) => setHealth("diet", e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-[#002B49]/10 text-[14px] text-[#002B49] focus:border-[#E1251B]/50 focus:outline-none transition-colors min-h-[44px] bg-white"
        >
          <option value="">Seleziona...</option>
          {quizData.diets.map((d) => (
            <option key={d.value} value={d.label}>
              {d.label}
            </option>
          ))}
        </select>
      </FormField>

      {/* Allergie */}
      <FormField label="Allergie o intolleranze">
        <ChipSelector
          options={quizData.allergies}
          selected={health.allergies}
          onChange={(v) => setHealth("allergies", v)}
        />
      </FormField>

      {/* Problemi di salute */}
      <FormField label="Problemi di salute">
        <ChipSelector
          options={quizData.healthIssues}
          selected={health.healthIssues}
          onChange={(v) => setHealth("healthIssues", v)}
        />
      </FormField>
    </section>
  );
}
