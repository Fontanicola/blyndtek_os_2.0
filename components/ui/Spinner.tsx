import { cn } from "@/lib/cn";
import type { SpinnerColor, SpinnerSize } from "@/types/ui";

type SpinnerProps = {
  size?: SpinnerSize;
  color?: SpinnerColor;
  className?: string;
};

const sizeClasses: Record<SpinnerSize, string> = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8"
};

const colorClasses: Record<SpinnerColor, string> = {
  signal: "text-signal",
  white: "text-white",
  graphite: "text-graphite"
};

export function Spinner({
  size = "md",
  color = "signal",
  className
}: SpinnerProps) {
  return (
    <svg
      className={cn("animate-spinner", sizeClasses[size], colorClasses[color], className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="42 18"
        opacity="0.95"
      />
    </svg>
  );
}
