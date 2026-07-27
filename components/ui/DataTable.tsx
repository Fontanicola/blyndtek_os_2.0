import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type DataTableProps = HTMLAttributes<HTMLTableElement> & {
  children: ReactNode;
  wrapperClassName?: string;
};

export function DataTable({ children, className, wrapperClassName, ...props }: DataTableProps) {
  return (
    <div className={cn("w-full min-w-0 overflow-x-auto rounded-md border border-line-soft bg-white shadow-none", wrapperClassName)}>
      <table {...props} className={cn("w-full border-collapse text-left", className)}>
        {children}
      </table>
    </div>
  );
}

export function DataTableHeader({ children, className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} className={cn("bg-paper text-xs font-label text-graphite", className)}>{children}</thead>;
}

export function DataTableBody({ children, className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} className={cn("bg-white", className)}>{children}</tbody>;
}

export function DataTableRow({ children, className, expanded = false, ...props }: HTMLAttributes<HTMLTableRowElement> & { expanded?: boolean }) {
  return (
    <tr {...props} className={cn("border-b border-line-soft bg-white transition-colors duration-fast ease-fast last:border-b-0 hover:bg-paper/50", expanded && "bg-signal-light hover:bg-signal-light", className)}>
      {children}
    </tr>
  );
}

export function DataTableHead({ children, className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th {...props} className={cn("whitespace-nowrap px-3 py-2.5 font-label", className)}>{children}</th>;
}

export function DataTableCell({ children, className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} className={cn("px-3 py-2.5 align-middle text-sm text-graphite", className)}>{children}</td>;
}
