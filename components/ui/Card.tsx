import type { HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardPadding = "none" | "sm" | "md" | "lg";

type CardProps = {
  children: ReactNode;
  className?: string;
  padding?: CardPadding;
  onClick?: HTMLAttributes<HTMLDivElement>["onClick"];
};

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6"
};

export function Card({ children, className, padding = "md", onClick }: CardProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onClick) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.currentTarget.click();
    }
  }

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "rounded-card bg-white shadow-card",
        paddingClasses[padding],
        onClick &&
          "cursor-pointer transition-shadow duration-normal ease-normal hover:shadow-modal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/20",
        className
      )}
    >
      {children}
    </div>
  );
}
