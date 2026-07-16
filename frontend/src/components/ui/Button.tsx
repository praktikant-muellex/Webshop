import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "outline";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 focus-visible:outline-primary-600",
  secondary: "bg-secondary-600 text-white hover:bg-secondary-700 focus-visible:outline-secondary-600",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600",
  outline:
    "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-3.5 py-2 text-sm font-medium
        transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
        disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
