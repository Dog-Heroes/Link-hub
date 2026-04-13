"use client";

import { useRef, useEffect, useCallback } from "react";
import { QuizProvider, useQuiz } from "./QuizContext";
import ProgressBar from "./ui/ProgressBar";
import DogDetailsStep from "./steps/DogDetailsStep";
import HealthStep from "./steps/HealthStep";
import PlanStep from "./steps/PlanStep";
import { trackEvent } from "@/lib/analytics";

function QuizContent() {
  const { state, dispatch } = useQuiz();
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const setRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      sectionRefs.current[index] = el;
    },
    []
  );

  // IntersectionObserver to update current section on scroll
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sectionRefs.current.forEach((ref, i) => {
      if (!ref) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            dispatch({ type: "SET_SECTION", section: i + 1 });
            trackEvent("quiz_section_view", { section: i + 1 });
          }
        },
        { threshold: 0.4 }
      );
      observer.observe(ref);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [dispatch]);

  function scrollToStep(step: number) {
    const ref = sectionRefs.current[step - 1];
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Sticky progress bar */}
      <div className="sticky top-0 z-20 bg-[#F9F6F1] border-b border-[#002B49]/5">
        <ProgressBar
          currentStep={state.currentSection}
          onStepClick={scrollToStep}
        />
      </div>

      <div className="flex flex-col gap-8 px-4 pt-5 pb-8">
        {/* Section 1: Dog Details */}
        <div ref={setRef(0)} className="scroll-mt-20">
          <DogDetailsStep />
        </div>

        {/* Divider */}
        <div className="h-px bg-[#002B49]/8" />

        {/* Section 2: Health */}
        <div ref={setRef(1)} className="scroll-mt-20">
          <HealthStep />
        </div>

        {/* Divider */}
        <div className="h-px bg-[#002B49]/8" />

        {/* Section 3: Your Plan */}
        <div ref={setRef(2)} className="scroll-mt-20">
          <PlanStep />
        </div>
      </div>
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
