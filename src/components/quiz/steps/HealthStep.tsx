"use client";

import { useQuiz, type HealthData } from "../QuizContext";
import FormField from "../ui/FormField";
import ToggleSwitch from "../ui/ToggleSwitch";
import MultiSelectDropdown from "../ui/MultiSelectDropdown";

export default function HealthStep() {
  const { state, dispatch } = useQuiz();
  const { health, options } = state;
  const opts = options!;

  function setHealth<K extends keyof HealthData>(field: K, value: HealthData[K]) {
    dispatch({ type: "SET_HEALTH", field, value });
  }

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-[12px] font-extrabold uppercase tracking-[0.15em] text-[#002B49]/40">
        Salute
      </h2>

      {/* Sterilizzato — NESSUN default: il sito stesso non ne ha uno
          (verificato dal vivo), per questo sono due bottoni indipendenti
          invece del ToggleSwitch, che mostrerebbe sempre una scelta come
          "attiva" fin dall'inizio. */}
      <FormField label="È sterilizzato/a?">
        <div className="flex gap-2">
          {[opts.sterilization[0], opts.sterilization[1]].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setHealth("neutered", opt.value)}
              className={`
                flex-1 py-3 rounded-xl text-[13px] font-bold transition-colors min-h-[44px]
                ${
                  health.neutered === opt.value
                    ? "bg-[#E1251B] text-white border-2 border-[#E1251B]"
                    : "bg-white text-[#002B49] border-2 border-[#002B49]/10 hover:border-[#E1251B]/30"
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FormField>

      {/* Livello attivita */}
      <FormField label="Livello di attività" htmlFor="activity">
        <div className="flex gap-2 flex-wrap">
          {opts.activityLevels.map((al) => (
            <button
              key={al.value}
              type="button"
              onClick={() => setHealth("activity", al.value)}
              className={`
                flex-1 min-w-[calc(50%-4px)] py-3 rounded-xl text-[13px] font-bold transition-colors min-h-[44px]
                ${
                  health.activity === al.value
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

      {/* Appetito */}
      <FormField label="Come definiresti il suo appetito?">
        <div className="flex gap-2 flex-wrap">
          {opts.hungerLevels.map((hl) => (
            <button
              key={hl.value}
              type="button"
              onClick={() => setHealth("hunger", hl.value)}
              className={`
                flex-1 min-w-[calc(50%-4px)] py-3 rounded-xl text-[13px] font-bold transition-colors min-h-[44px]
                ${
                  health.hunger === hl.value
                    ? "bg-[#E1251B] text-white border-2 border-[#E1251B]"
                    : "bg-white text-[#002B49] border-2 border-[#002B49]/10 hover:border-[#E1251B]/30"
                }
              `}
            >
              {hl.label}
            </button>
          ))}
        </div>
      </FormField>

      {/* Dieta attuale — multi-selezione, come sul sito (quiz[][diet][]).
          Dropdown compatto invece delle pillole: su mobile 4 pillole intere
          occupavano troppo spazio verticale. */}
      <FormField label="Che tipo di alimentazione sta seguendo?">
        <MultiSelectDropdown
          options={opts.diets}
          selected={health.diet}
          onChange={(v) => setHealth("diet", v)}
          placeholder="Seleziona la dieta…"
        />
      </FormField>

      {/* Allergie — stesso dropdown; "nessuna" resta esclusiva (deseleziona
          le altre e viceversa, vedi MultiSelectDropdown/quiz-options). */}
      <FormField label="Allergie o intolleranze">
        <MultiSelectDropdown
          options={opts.allergies}
          selected={health.allergies}
          onChange={(v) => setHealth("allergies", v)}
          placeholder="Seleziona le allergie…"
        />
      </FormField>

      {/* Esigenze di salute */}
      <FormField label="Ha esigenze di salute?">
        <ToggleSwitch
          options={[
            { value: "no", label: "No" },
            { value: "yes", label: "Sì" },
          ]}
          value={health.hasDiseases}
          onChange={(v) => {
            setHealth("hasDiseases", v);
            if (v === "no") setHealth("healthIssues", []);
          }}
        />
      </FormField>

      {health.hasDiseases === "yes" && (
        // Stesso dropdown: 10 patologie in pillole erano ancora più
        // ingombranti delle 12 allergie.
        <FormField label="Quali?">
          <MultiSelectDropdown
            options={opts.healthIssues}
            selected={health.healthIssues}
            onChange={(v) => setHealth("healthIssues", v)}
            placeholder="Seleziona…"
          />
        </FormField>
      )}
    </section>
  );
}
