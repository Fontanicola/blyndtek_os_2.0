"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export type EntityMultiSelectOption = {
  id: string;
  label: string;
  sublabel?: string;
};

export type EntityMultiSelectProps = {
  label: string;
  values: string[];
  onChange: (ids: string[]) => void;
  options: EntityMultiSelectOption[];
  placeholder?: string;
  required?: boolean;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  helperText?: ReactNode;
};

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function EntityMultiSelect({
  label,
  values,
  onChange,
  options,
  placeholder = "Seleccionar",
  required = false,
  loading = false,
  disabled = false,
  className,
  helperText
}: EntityMultiSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOptions = useMemo(
    () => options.filter((option) => values.includes(option.id)),
    [options, values]
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => {
      const labelMatch = option.label.toLowerCase().includes(normalizedQuery);
      const sublabelMatch = option.sublabel?.toLowerCase().includes(normalizedQuery) ?? false;
      return labelMatch || sublabelMatch;
    });
  }, [options, query]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    searchRef.current?.focus();
  }, [open]);

  function toggleValue(id: string) {
    if (values.includes(id)) {
      onChange(values.filter((currentId) => currentId !== id));
      return;
    }

    onChange([...values, id]);
  }

  const displayValue =
    loading
      ? "Cargando..."
      : selectedOptions.length === 0
        ? placeholder
        : selectedOptions.length === 1
          ? selectedOptions[0]?.label ?? placeholder
          : `${selectedOptions.length} seleccionados`;

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <label className="mb-1 block text-sm font-label text-carbon">
        {label}
        {required ? <span className="ml-1 text-graphite">*</span> : null}
      </label>

      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex min-h-10 w-full items-center justify-between gap-3 rounded-component border border-line bg-white px-3 py-2 text-left text-base text-carbon",
          "transition-all duration-fast ease-fast placeholder:text-graphite focus:outline-none focus:ring-2 focus:ring-signal/20",
          open && "border-signal ring-2 ring-signal/20",
          (disabled || loading) && "cursor-not-allowed bg-paper opacity-60"
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", selectedOptions.length === 0 && "text-graphite")}>
          {displayValue}
        </span>
        <span className="shrink-0 text-graphite">
          <ChevronIcon />
        </span>
      </button>

      {helperText ? <p className="mt-1 text-xs text-graphite">{helperText}</p> : null}

      {open ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-card border border-line-soft bg-white shadow-modal">
          <div className="border-b border-line-soft p-3">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-graphite">
                <SearchIcon />
              </span>
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar..."
                className={cn(
                  "h-10 w-full rounded-component border border-line bg-white pl-10 pr-3 text-sm text-carbon",
                  "placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                )}
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const selected = values.includes(option.id);

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleValue(option.id)}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-component px-3 py-2 text-left text-sm transition-colors duration-fast ease-fast",
                      selected ? "bg-signal-light text-carbon" : "text-carbon hover:bg-paper"
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-label">{option.label}</span>
                      {option.sublabel ? (
                        <span className="block truncate text-xs text-graphite">{option.sublabel}</span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border text-[10px]",
                        selected
                          ? "border-signal bg-signal text-white"
                          : "border-line bg-white text-transparent"
                      )}
                    >
                      ✓
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-sm text-graphite">No hay resultados.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
