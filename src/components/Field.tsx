import type { ReactNode } from "react";

type FieldProps = { label: string; htmlFor?: string; children: ReactNode };

export default function Field({ label, htmlFor, children }: FieldProps) {
  return (
    <div className="relative w-full">
      <label htmlFor={htmlFor} className="block pb-[11px] font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}

export const inputClass =
  "h-[58px] w-full rounded-[10px] border-2 border-line bg-white px-5 text-base outline-none placeholder:text-placeholder focus:border-focus";
