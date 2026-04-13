"use client";

import { useState, useMemo } from "react";
import { useQuiz } from "../QuizContext";
import FormField from "../ui/FormField";
import ToggleSwitch from "../ui/ToggleSwitch";
import quizData from "@/config/quiz.json";

export default function DogDetailsStep() {
  const { state, dispatch } = useQuiz();
  const { dog } = state;

  const [breedSearch, setBreedSearch] = useState(dog.breed);
  const [showBreedList, setShowBreedList] = useState(false);

  const filteredBreeds = useMemo(() => {
    if (!breedSearch) return quizData.breeds;
    const q = breedSearch.toLowerCase();
    return quizData.breeds.filter((b) => b.toLowerCase().includes(q));
  }, [breedSearch]);

  function setDog(field: string, value: string | number) {
    dispatch({ type: "SET_DOG", field: field as keyof typeof dog, value });
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

      {/* Razza */}
      <FormField label="Razza" htmlFor="dog-breed">
        <div className="relative">
          <input
            id="dog-breed"
            type="text"
            value={breedSearch}
            onChange={(e) => {
              setBreedSearch(e.target.value);
              setShowBreedList(true);
            }}
            onFocus={() => setShowBreedList(true)}
            placeholder="Cerca razza..."
            className="w-full px-4 py-3 rounded-xl border-2 border-[#002B49]/10 text-[14px] text-[#002B49] placeholder:text-[#002B49]/30 focus:border-[#E1251B]/50 focus:outline-none transition-colors min-h-[44px]"
          />
          {showBreedList && filteredBreeds.length > 0 && (
            <div className="absolute z-30 mt-1 w-full max-h-48 overflow-y-auto bg-white rounded-xl border-2 border-[#002B49]/10 shadow-lg">
              {filteredBreeds.map((breed) => (
                <button
                  key={breed}
                  type="button"
                  onClick={() => {
                    setDog("breed", breed);
                    setBreedSearch(breed);
                    setShowBreedList(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#002B49] hover:bg-[#E1251B]/5 transition-colors min-h-[40px]"
                >
                  {breed}
                </button>
              ))}
            </div>
          )}
        </div>
      </FormField>

      {/* Sesso */}
      <FormField label="Sesso">
        <ToggleSwitch
          options={["Maschietto", "Femminuccia"]}
          value={dog.gender}
          onChange={(v) => setDog("gender", v)}
        />
      </FormField>

      {/* Eta */}
      <FormField label="Quanti anni ha?">
        <div className="flex gap-3">
          <div className="flex-1">
            <select
              value={dog.ageYears}
              onChange={(e) => setDog("ageYears", Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border-2 border-[#002B49]/10 text-[14px] text-[#002B49] focus:border-[#E1251B]/50 focus:outline-none transition-colors min-h-[44px] bg-white"
            >
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
              onChange={(e) => setDog("ageMonths", Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border-2 border-[#002B49]/10 text-[14px] text-[#002B49] focus:border-[#E1251B]/50 focus:outline-none transition-colors min-h-[44px] bg-white"
            >
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
          min="0.5"
          max="100"
          step="0.5"
          value={dog.weight}
          onChange={(e) => setDog("weight", e.target.value)}
          placeholder="Es. 12"
          className="w-full px-4 py-3 rounded-xl border-2 border-[#002B49]/10 text-[14px] text-[#002B49] placeholder:text-[#002B49]/30 focus:border-[#E1251B]/50 focus:outline-none transition-colors min-h-[44px]"
        />
      </FormField>

      {/* Corporatura */}
      <FormField label="Corporatura">
        <div className="flex gap-2">
          {quizData.bodyConditions.map((bc) => (
            <button
              key={bc.value}
              type="button"
              onClick={() => setDog("bodyCondition", bc.label)}
              className={`
                flex-1 py-3 rounded-xl text-[13px] font-bold transition-colors min-h-[44px]
                ${
                  dog.bodyCondition === bc.label
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
