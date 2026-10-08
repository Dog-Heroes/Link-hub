"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuiz } from "../QuizContext";
import type { QuizOption } from "@/lib/quiz-options";

function labelFor(options: QuizOption[] | undefined, value: string): string {
  return options?.find((o) => o.value === value)?.label ?? value;
}

export default function DogSummaryCard() {
  const { state } = useQuiz();
  const { dog, health, options } = state;
  const [open, setOpen] = useState(true);

  const dogName = dog.name || "Il tuo cane";
  const hasData = dog.name || dog.breed || dog.gender;

  if (!hasData) return null;

  const rows: { icon: string; text: string }[] = [];
  if (dog.breedLabel) rows.push({ icon: "🐕", text: dog.breedLabel });
  if (dog.gender) {
    rows.push({
      icon: dog.gender === "male" ? "♂" : "♀",
      text: labelFor(options?.sex, dog.gender),
    });
  }
  if (dog.ageYears || dog.ageMonths) {
    const parts = [];
    if (dog.ageYears) parts.push(`${dog.ageYears} ann${dog.ageYears === 1 ? "o" : "i"}`);
    if (dog.ageMonths) parts.push(`${dog.ageMonths} mes${dog.ageMonths === 1 ? "e" : "i"}`);
    rows.push({ icon: "🎂", text: parts.join(" e ") });
  }

  const details: string[] = [];
  if (dog.weight) {
    const bc = dog.bodyCondition ? labelFor(options?.bodyConditions, dog.bodyCondition) : null;
    details.push(`Pesa ${dog.weight}kg${bc ? ` e la sua corporatura è ${bc}` : ""}`);
  }
  if (health.diet.length > 0) {
    details.push(`Dieta attuale: ${health.diet.map((d) => labelFor(options?.diets, d)).join(", ")}`);
  }
  const allergyLabels = health.allergies.filter((a) => a !== "nessuna");
  if (allergyLabels.length > 0) {
    details.push(`Allergie: ${allergyLabels.map((a) => labelFor(options?.allergies, a)).join(", ")}`);
  } else if (dog.breed) {
    details.push("Allergie: nessuna");
  }
  if (health.hasDiseases === "yes" && health.healthIssues.length > 0) {
    details.push(
      `Problemi di salute: ${health.healthIssues.map((h) => labelFor(options?.healthIssues, h)).join(", ")}`
    );
  } else if (dog.breed) {
    details.push("Problemi di salute: nessuno");
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-[#002B49]/8 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[44px]"
      >
        <span className="text-[14px] font-extrabold text-[#002B49] uppercase">
          {dogName}
        </span>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          className="text-[#002B49]/40"
        >
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 flex flex-col gap-2">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2 text-[13px] text-[#002B49]">
                  <span className="w-5 text-center">{row.icon}</span>
                  <span className="font-semibold">{row.text}</span>
                </div>
              ))}
              {details.length > 0 && (
                <div className="mt-1 pt-2 border-t border-[#002B49]/8 flex flex-col gap-1">
                  {details.map((d, i) => (
                    <span key={i} className="text-[12px] text-[#002B49]/60">{d}</span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
