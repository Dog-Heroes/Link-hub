"use client";

import { useEffect, useId, useRef, useState } from "react";

interface DropdownOption {
  value: string;
  label: string;
  exclusive?: boolean;
}

interface MultiSelectDropdownProps {
  options: DropdownOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  /** Shown in the closed trigger when nothing is selected. */
  placeholder?: string;
}

/**
 * Compact multi-select dropdown for the mini quiz — replaces a wall of
 * pills (diet, allergies, health issues) with a single closed control that
 * shows a summary ("Pollo, Manzo") and opens a checklist on tap. Same
 * selection semantics as ChipSelector (options/selected are the exact same
 * handles the live dogheroes.it quiz uses — see src/lib/quiz-options.ts):
 * an `exclusive` option (e.g. "nessuna") clears every other selection and
 * is itself cleared by picking anything else.
 */
export default function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = "Seleziona…",
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle(option: DropdownOption) {
    if (option.exclusive) {
      onChange(selected.includes(option.value) ? [] : [option.value]);
      return;
    }

    const withoutExclusive = selected.filter(
      (v) => !options.find((o) => o.value === v && o.exclusive)
    );

    if (withoutExclusive.includes(option.value)) {
      onChange(withoutExclusive.filter((v) => v !== option.value));
    } else {
      onChange([...withoutExclusive, option.value]);
    }
  }

  const summary =
    selected.length === 0
      ? placeholder
      : selected
          .map((v) => options.find((o) => o.value === v)?.label ?? v)
          .join(", ");

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className={`
          w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl
          border-2 text-left text-[14px] min-h-[44px] bg-white transition-colors
          ${open ? "border-[#E1251B]/50" : "border-[#002B49]/10 hover:border-[#E1251B]/30"}
        `}
      >
        <span
          className={`truncate ${
            selected.length === 0
              ? "text-[#002B49]/30 font-normal"
              : "text-[#002B49] font-bold"
          }`}
        >
          {summary}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className={`flex-shrink-0 text-[#002B49]/40 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto bg-white rounded-xl border-2 border-[#002B49]/10 shadow-lg p-1"
        >
          {options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => toggle(option)}
                className={`
                  w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg
                  text-[13px] font-semibold min-h-[40px] transition-colors
                  ${isSelected ? "bg-[#E1251B]/8 text-[#002B49]" : "text-[#002B49] hover:bg-[#002B49]/5"}
                `}
              >
                <span
                  aria-hidden="true"
                  className={`flex items-center justify-center w-5 h-5 rounded-md border-2 flex-shrink-0 ${
                    isSelected ? "bg-[#E1251B] border-[#E1251B]" : "border-[#002B49]/20"
                  }`}
                >
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
