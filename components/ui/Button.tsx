import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-emerald-600 text-white hover:bg-emerald-700",
  secondary:
    "bg-transparent border border-black/15 text-black hover:bg-black/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
