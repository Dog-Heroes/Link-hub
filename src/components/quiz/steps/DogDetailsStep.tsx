"use client";

import { useState, useMemo } from "react";
import { useQuiz } from "../QuizContext";
import FormField from "../ui/FormField";

export default function DogDetailsStep() {
  const { state, dispatch } = useQuiz();
  const { dog, options } = state;

  const [breedSearch, setBreedSearch] = useState(dog.breedLabel);
  const [showBreedList, setShowBreedList] = useState(false);

  const filteredBreeds = useMemo(() => {
    const breeds = options?.breeds ?? [];
    if (!breedSearch) return breeds;
    const q = breedSearch.toLowerCase();
    return breeds.filter((b) => b.label.toLowerCase().includes(q));
  }, [breedSearch, options]);

  function setDog<K extends keyof typeof dog>(field: K, value: (typeof dog)[K]) {
    dispatch({ type: "SET_DOG", field, value });
  }

  function selectBreed(breed: { value: string; label: string }) {
    setDog("breed", breed.value);
    setDog("breedLabel", breed.label);
    setBreedSearch(breed.label);
    setShowBreedList(false);
  }

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-[12px] font-extrabold uppercase tracking-[0.15em] text-[#002B49]/40">
        Dettagli del cane
      </h2>

      {/* Nome */}
      <FormField label="Come si chiama il tuo cane?" htmlFor="dog-name">
        <input
          id="dog-name"
          type="text"
          value={dog.name}
          onChange={(e) => setDog("name", e.target.value)}
          placeholder="Es. Pippo"
          className="w-full px-4 py-3 rounded-xl border-2 border-[#002B49]/10 text-[14px] text-[#002B49] placeholder:text-[#002B49]/30 focus:border-[#E1251B]/50 focus:outline-none transition-colors min-h-[44px]"
        />
      </FormField>

      {/* Razza — selezione da elenco (con ricerca) degli handle reali del
          sito: niente testo libero, per evitare che il bridge scarti una
          razza che non esiste come metaobject. */}
      <FormField label="Razza" htmlFor="dog-breed">
        <div className="relative">
          <input
            id="dog-breed"
            type="text"
            value={breedSearch}
            onChange={(e) => {
              setBreedSearch(e.target.value);
              setShowBreedList(true);
              if (dog.breed) {
                setDog("breed", "");
                setDog("breedLabel", "");
              }
            }}
            onFocus={() => setShowBreedList(true)}
            onBlur={() => {
              // Keep free text from being submitted as a breed: if the
              // user leaves without picking from the list, restore the
              // last valid selection (or clear the search).
              window.setTimeout(() => {
                setShowBreedList(false);
                setBreedSearch(dog.breedLabel);
              }, 150);
            }}
            placeholder="Cerca la sua razza..."
            autoComplete="off"
            className="w-full px-4 py-3 rounded-xl border-2 border-[#002B49]/10 text-[14px] text-[#002B49] placeholder:text-[#002B49]/30 focus:border-[#E1251B]/50 focus:outline-none transition-colors min-h-[44px]"
          />
          {showBreedList && filteredBreeds.length > 0 && (
            <div className="absolute z-30 mt-1 w-full max-h-48 overflow-y-auto bg-white rounded-xl border-2 border-[#002B49]/10 shadow-lg">
              {filteredBreeds.map((breed) => (
                <button
                  key={breed.value}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectBreed(breed)}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#002B49] hover:bg-[#E1251B]/5 transition-colors min-h-[40px]"
                >
                  {breed.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </FormField>

      {/* Sesso — NESSUN default: il sito stesso non ne ha uno (verificato
          dal vivo), per questo sono due bottoni indipendenti (come
          Corporatura più sotto) invece del ToggleSwitch, che mostrerebbe
          sempre una delle due opzioni come "attiva". */}
      <FormField label="Sesso">
        <div className="flex gap-2">
          {[options!.sex[0], options!.sex[1]].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDog("gender", opt.value)}
              className={`
                flex-1 py-3 rounded-xl text-[13px] font-bold transition-colors min-h-[44px]
                ${
                  dog.gender === opt.value
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

      {/* Eta — NESSUN default (placeholder "Anni"/"Mesi"): il sito lascia
          questi due campi vuoti finché l'utente non sceglie esplicitamente
          un valore per entrambi (0 anni + 0 mesi è accettato dal sito una
          volta scelto, ma non è mai preselezionato — verificato dal vivo,
          vedi isQuizValid in PlanStep.tsx). */}
      <FormField label="Quanti anni ha?">
        <div className="flex gap-3">
          <div className="flex-1">
            <select
              value={dog.ageYears}
              onChange={(e) => setDog("ageYears", e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border-2 border-[#002B49]/10 text-[14px] focus:border-[#E1251B]/50 focus:outline-none transition-colors min-h-[44px] bg-white ${
                dog.ageYears === "" ? "text-[#002B49]/40" : "text-[#002B49]"
              }`}
            >
              <option value="" disabled hidden>
                Anni
              </option>
              {Array.from({ length: 21 }, (_, i) => (
                <option key={i} value={i}>
                  {i} {i === 1 ? "anno" : "anni"}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <select
              value={dog.ageMonths}
              onChange={(e) => setDog("ageMonths", e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border-2 border-[#002B49]/10 text-[14px] focus:border-[#E1251B]/50 focus:outline-none transition-colors min-h-[44px] bg-white ${
                dog.ageMonths === "" ? "text-[#002B49]/40" : "text-[#002B49]"
              }`}
            >
              <option value="" disabled hidden>
                Mesi
              </option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {i} {i === 1 ? "mese" : "mesi"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FormField>

      {/* Peso */}
      <FormField label="Quanto pesa? (kg)" htmlFor="dog-weight">
        <input
          id="dog-weight"
          type="number"
          inputMode="decimal"
          min={options!.weight.min}
          max={options!.weight.max}
          step={options!.weight.step}
          value={dog.weight}
          onChange={(e) => setDog("weight", e.target.value)}
          placeholder="Es. 12"
          className="w-full px-4 py-3 rounded-xl border-2 border-[#002B49]/10 text-[14px] text-[#002B49] placeholder:text-[#002B49]/30 focus:border-[#E1251B]/50 focus:outline-none transition-colors min-h-[44px]"
        />
      </FormField>

      {/* Corporatura */}
      <FormField label="Corporatura">
        <div className="flex gap-2">
          {options!.bodyConditions.map((bc) => (
            <button
              key={bc.value}
              type="button"
              onClick={() => setDog("bodyCondition", bc.value)}
              className={`
                flex-1 py-3 rounded-xl text-[13px] font-bold transition-colors min-h-[44px]
                ${
                  dog.bodyCondition === bc.value
                    ? "bg-[#E1251B] text-white border-2 border-[#E1251B]"
                    : "bg-white text-[#002B49] border-2 border-[#002B49]/10 hover:border-[#E1251B]/30"
                }
              `}
            >
              {bc.label}
            </button>
          ))}
        </div>
      </FormField>
    </section>
  );
}
