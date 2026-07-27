import { forwardRef } from "react";
import type { AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Link = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(
  function Link({ className, children, ...props }, ref) {
    return (
      <a
        ref={ref}
        className={cn(
          "text-signal underline decoration-signal/40 underline-offset-2 transition-colors duration-fast ease-fast hover:text-signal-hover hover:decoration-signal",
          className
        )}
        {...props}
      >
        {children}
      </a>
    );
  }
);

Link.displayName = "Link";
