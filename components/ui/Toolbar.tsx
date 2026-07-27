import type { ReactNode } from "react";
import { Input } from "./Input";
import { FilterPopover } from "./FilterPopover";
import { cn } from "@/lib/cn";

type ToolbarProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filterContent?: ReactNode;
  filterCount?: number;
  secondaryActions?: ReactNode;
  primaryAction?: ReactNode;
  className?: string;
};

export function Toolbar({ searchValue, onSearchChange, searchPlaceholder = "Buscar", filterContent, filterCount = 0, secondaryActions, primaryAction, className }: ToolbarProps) {
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}>
      {onSearchChange ? (
        <div className="min-w-[220px] flex-1">
          <Input value={searchValue ?? ""} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchPlaceholder} />
        </div>
      ) : null}
      {filterContent ? <FilterPopover activeCount={filterCount}>{filterContent}</FilterPopover> : null}
      {secondaryActions ? <div className="flex flex-wrap items-center gap-2">{secondaryActions}</div> : null}
      {primaryAction ? <div className="ml-auto flex shrink-0 items-center gap-2">{primaryAction}</div> : null}
    </div>
  );
}
