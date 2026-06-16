import { forwardRef } from "react";

type Variant = "primary" | "ghost" | "danger";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-primary hover:bg-primary-hover text-white shadow-sm shadow-primary/30",
  ghost:
    "bg-transparent hover:bg-surface-2 text-foreground border border-border",
  danger: "bg-danger/90 hover:bg-danger text-white",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className = "", variant = "primary", ...props }, ref) {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
        {...props}
      />
    );
  },
);
