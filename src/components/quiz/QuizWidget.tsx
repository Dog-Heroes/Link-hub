"use client";

import { QuizProvider } from "./QuizContext";
import DogDetailsStep from "./steps/DogDetailsStep";
import HealthStep from "./steps/HealthStep";
import PlanStep from "./steps/PlanStep";

function QuizContent() {
  return (
    <div className="flex flex-col gap-8 px-4 pt-5 pb-8">
      {/* Intro */}
      <p
        className="text-center text-[17px] font-bold text-[#E1251B]"
        style={{ fontFamily: "var(--font-brand)" }}
      >
        Crea il piano di Fido in 1 minuto
      </p>

      {/* Dog Details */}
      <DogDetailsStep />

      {/* Divider */}
      <div className="h-px bg-[#002B49]/8" />

      {/* Health */}
      <HealthStep />

      {/* Divider */}
      <div className="h-px bg-[#002B49]/8" />

      {/* Your Plan */}
      <PlanStep />
    </div>
  );
}

export default function QuizWidget() {
  return (
    <QuizProvider>
      <QuizContent />
    </QuizProvider>
  );
}
