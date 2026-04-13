"use client";

import { motion } from "framer-motion";

interface ToggleSwitchProps {
  options: [string, string]; // [left, right]
  value: string;
  onChange: (value: string) => void;
}

export default function ToggleSwitch({ options, value, onChange }: ToggleSwitchProps) {
  const activeIndex = value === options[1] ? 1 : 0;

  return (
    <div className="relative flex bg-[#002B49]/5 rounded-full p-1 min-h-[44px]">
      <motion.div
        className="absolute top-1 bottom-1 rounded-full bg-[#E1251B]"
        initial={false}
        animate={{ left: activeIndex === 0 ? "4px" : "50%" }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        style={{ width: "calc(50% - 4px)" }}
      />
      {options.map((option, i) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`
            relative z-10 flex-1 py-2.5 text-[13px] font-bold text-center rounded-full transition-colors
            ${activeIndex === i ? "text-white" : "text-[#002B49]/60"}
          `}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
