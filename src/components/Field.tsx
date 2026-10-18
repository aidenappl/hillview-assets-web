import type { ReactNode } from "react";

type FieldProps = { label: string; htmlFor?: string; children: ReactNode };

export default function Field({ label, htmlFor, children }: FieldProps) {
  return (
    <div className="relative w-full">
      <label
        htmlFor={htmlFor}
        className="block pb-2 pl-1 text-sm font-semibold text-ink-soft"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export const inputClass =
  "h-14 w-full rounded-2xl border border-[#d5dbe6] bg-white px-5 text-base text-ink shadow-[0_1px_2px_rgba(30,41,80,0.05)] outline-none transition-[box-shadow,border-color] duration-200 placeholder:text-[#9aa3b2] hover:border-[#c3cad8] focus:border-brand focus:shadow-[0_0_0_4px_rgba(48,103,246,0.15)]";
