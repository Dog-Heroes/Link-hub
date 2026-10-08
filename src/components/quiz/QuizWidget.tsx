"use client";

import { useEffect } from "react";
import { QuizProvider, useQuiz } from "./QuizContext";
import DogDetailsStep from "./steps/DogDetailsStep";
import HealthStep from "./steps/HealthStep";
import PlanStep from "./steps/PlanStep";
import type { QuizOptions } from "@/lib/quiz-options";

function QuizContent() {
  const { state, dispatch } = useQuiz();

  // Load the live quiz options once (breeds, activity levels, body
  // condition, allergies, health issues…) so the widget always shows and
  // sends the same values as https://www.dogheroes.it/pages/quiz — see
  // src/lib/quiz-options.ts for why this can't be a hardcoded copy.
  useEffect(() => {
    let cancelled = false;

    fetch("/api/quiz-options")
      .then((res) => res.json())
      .then((options: QuizOptions) => {
        if (!cancelled) dispatch({ type: "SET_OPTIONS", options });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: "SET_OPTIONS_LOADING", loading: false });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-8 px-4 pt-5 pb-8">
      {/* Intro */}
      <p
        className="text-center text-[17px] font-bold text-[#E1251B]"
        style={{ fontFamily: "var(--font-brand)" }}
      >
        Crea il piano di Fido in 1 minuto
      </p>

      {state.optionsLoading || !state.options ? (
        <div className="flex flex-col items-center gap-3 py-10 text-[#002B49]/50">
          <div className="h-8 w-8 rounded-full border-2 border-[#002B49]/15 border-t-[#E1251B] animate-spin" />
          <span className="text-[13px] font-semibold">Carico le opzioni del quiz…</span>
        </div>
      ) : (
        <>
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
        </>
      )}
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
