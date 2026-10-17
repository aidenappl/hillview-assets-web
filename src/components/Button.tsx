import type { ButtonHTMLAttributes } from "react";
import Spinner from "@/components/Spinner";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  loading?: boolean;
};

const VARIANTS = {
  primary: "bg-brand text-white",
  secondary: "bg-dark text-[#f4f4f4] font-medium",
} as const;

// The kiosk's full-width 60px action button. While loading the label is
// replaced by the spinner, as in the Angular version.
export default function Button({
  variant = "primary",
  loading = false,
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
      className={`relative flex h-[60px] w-full cursor-pointer items-center justify-center rounded-[10px] text-base outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-default ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}
