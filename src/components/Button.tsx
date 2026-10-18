import type { ButtonHTMLAttributes, ReactNode } from "react";
import Spinner from "@/components/Spinner";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  /** Keyboard hint shown on the right, e.g. "Enter". */
  hint?: ReactNode;
};

const VARIANTS = {
  primary:
    "bg-gradient-to-b from-[#4479ff] to-[#2a5ef0] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_-8px_rgba(48,103,246,0.55)] hover:from-[#3a72ff] hover:to-[#2354e0] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_12px_28px_-8px_rgba(48,103,246,0.6)]",
  secondary:
    "bg-white/70 text-ink-soft font-semibold ring-1 ring-inset ring-[#d5dbe6] hover:bg-white hover:ring-[#c3cad8]",
  ghost: "bg-transparent text-ink-soft font-medium hover:bg-white/50",
} as const;

// The kiosk's full-width 60px action button. While loading the label is
// replaced by the spinner, as in the Angular version.
export default function Button({
  variant = "primary",
  loading = false,
  hint,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`group relative flex h-14 w-full cursor-pointer select-none items-center justify-center gap-2 rounded-2xl text-base font-semibold tracking-[0.01em] outline-none transition-[background-color,box-shadow,transform] duration-200 ease-spring active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-focus/60 disabled:cursor-default disabled:opacity-60 disabled:shadow-none disabled:active:scale-100 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Spinner /> : children}
      {hint && !loading && (
        <kbd className="absolute right-4 rounded-md bg-white/15 px-2 py-0.5 font-sans text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {hint}
        </kbd>
      )}
    </button>
  );
}
