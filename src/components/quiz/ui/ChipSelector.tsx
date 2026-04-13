"use client";

import { motion } from "framer-motion";

interface ChipOption {
  value: string;
  label: string;
  exclusive?: boolean;
}

interface ChipSelectorProps {
  options: ChipOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function ChipSelector({ options, selected, onChange }: ChipSelectorProps) {
  function handleToggle(option: ChipOption) {
    if (option.exclusive) {
      // exclusive chip: deselect everything else
      onChange(selected.includes(option.value) ? [] : [option.value]);
      return;
    }

    // non-exclusive chip: remove any exclusive selection
    const withoutExclusive = selected.filter(
      (v) => !options.find((o) => o.value === v && o.exclusive)
    );

    if (withoutExclusive.includes(option.value)) {
      onChange(withoutExclusive.filter((v) => v !== option.value));
    } else {
      onChange([...withoutExclusive, option.value]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <motion.button
            key={option.value}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => handleToggle(option)}
            className={`
              px-4 py-2.5 rounded-full text-[13px] font-bold
              min-h-[44px] transition-colors
              ${
                isSelected
                  ? "bg-[#E1251B] text-white border-2 border-[#E1251B]"
                  : "bg-white text-[#002B49] border-2 border-[#002B49]/15 hover:border-[#E1251B]/40"
              }
            `}
          >
            {option.label}
          </motion.button>
        );
      })}
    </div>
  );
}
