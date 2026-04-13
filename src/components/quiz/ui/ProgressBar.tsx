"use client";

const STEPS = [
  { id: 1, label: "DETTAGLI" },
  { id: 2, label: "SALUTE" },
  { id: 3, label: "IL TUO PIANO" },
];

interface ProgressBarProps {
  currentStep: number; // 1, 2, or 3
  onStepClick: (step: number) => void;
}

export default function ProgressBar({ currentStep, onStepClick }: ProgressBarProps) {
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      {STEPS.map((step, i) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;

        return (
          <div key={step.id} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onStepClick(step.id)}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold transition-colors
                  ${
                    isCompleted
                      ? "bg-[#E1251B] text-white"
                      : isCurrent
                        ? "bg-[#E1251B] text-white"
                        : "bg-[#002B49]/10 text-[#002B49]/40"
                  }
                `}
              >
                {isCompleted ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <span
                className={`
                  text-[10px] font-extrabold uppercase tracking-[0.08em]
                  ${isCurrent || isCompleted ? "text-[#002B49]" : "text-[#002B49]/35"}
                `}
              >
                {step.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`
                  w-8 h-0.5 rounded-full -mt-5
                  ${step.id < currentStep ? "bg-[#E1251B]" : "bg-[#002B49]/10"}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
