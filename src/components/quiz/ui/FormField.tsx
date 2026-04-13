"use client";

import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}

export default function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[14px] font-bold text-[#002B49]"
      >
        {label}
      </label>
      {children}
      {error && (
        <span className="text-[12px] text-[#E1251B]">{error}</span>
      )}
    </div>
  );
}
