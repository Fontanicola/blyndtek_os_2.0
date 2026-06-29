"use client";

import type { ChangeEvent, InputHTMLAttributes, KeyboardEventHandler, FocusEventHandler, ReactNode } from "react";
import { cn } from "@/lib/cn";

type InputProps = {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  name?: string;
  id?: string;
  readOnly?: boolean;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  autoFocus?: boolean;
};

export function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  error,
  hint,
  disabled = false,
  required = false,
  className,
  leftIcon,
  rightIcon,
  name,
  id,
  readOnly = false,
  onBlur,
  onKeyDown,
  autoFocus
}: InputProps) {
  const inputId = id ?? name ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <label htmlFor={inputId} className="mb-1 block text-sm font-label text-carbon">
          {label}
          {required ? <span className="ml-1 text-graphite">*</span> : null}
        </label>
      ) : null}

      <div className="relative">
        {leftIcon ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-graphite">
            {leftIcon}
          </span>
        ) : null}

        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          className={cn(
            "w-full rounded-component border border-line bg-white px-3 py-2 text-base text-carbon transition-all duration-fast ease-fast",
            "placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20",
            Boolean(leftIcon) && "pl-10",
            Boolean(rightIcon) && "pr-10",
            error && "border-danger focus:border-danger focus:ring-danger/20",
            disabled && "cursor-not-allowed bg-paper opacity-60"
          )}
        />

        {rightIcon ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-graphite">
            {rightIcon}
          </span>
        ) : null}
      </div>

      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
      {!error && hint ? <p className="mt-1 text-xs text-graphite">{hint}</p> : null}
    </div>
  );
}
