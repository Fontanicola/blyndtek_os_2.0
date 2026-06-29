import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/Spinner";
import type { ButtonSize, ButtonVariant } from "@/types/ui";

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  loading?: boolean;
  className?: string;
} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "onClick" | "type">;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-signal text-white hover:bg-signal-hover focus-visible:ring-signal/20",
  secondary:
    "border border-line bg-white text-carbon hover:bg-paper focus-visible:ring-signal/20",
  ghost:
    "bg-transparent text-graphite hover:bg-paper hover:text-carbon focus-visible:ring-signal/20",
  danger:
    "bg-danger text-white hover:bg-danger-hover focus-visible:ring-danger/20"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "rounded-component px-3 py-1.5 text-sm font-label",
  md: "rounded-component px-4 py-2 text-base font-label",
  lg: "rounded-component px-5 py-2.5 text-md font-label"
};

const spinnerSizes: Record<ButtonSize, "xs" | "sm" | "md"> = {
  sm: "xs",
  md: "sm",
  lg: "sm"
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  onClick,
  disabled = false,
  loading = false,
  type = "button",
  className
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-colors duration-fast ease-fast active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2",
        sizeClasses[size],
        variantClasses[variant],
        isDisabled && "cursor-not-allowed opacity-40 active:scale-100",
        className
      )}
    >
      {loading ? (
        <>
          <Spinner
            size={spinnerSizes[size]}
            color={variant === "secondary" || variant === "ghost" ? "graphite" : "white"}
          />
          <span>Cargando...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
