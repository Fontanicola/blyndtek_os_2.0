import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type EmptyStateAction = {
  label: string;
  onClick: () => void;
};

type EmptyStateProps = {
  icon: ComponentType<LucideProps>;
  titulo: string;
  descripcion?: string;
  accion?: EmptyStateAction;
  className?: string;
};

export function EmptyState({ icon: Icon, titulo, descripcion, accion, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[160px] flex-col items-center justify-center rounded-card border border-dashed border-line bg-paper/45 px-6 py-8 text-center",
        className
      )}
    >
      <Icon size={40} strokeWidth={1.5} className="text-graphite/55" aria-hidden="true" />
      <h3 className="mt-4 font-label text-base text-carbon">{titulo}</h3>
      {descripcion ? <p className="mt-2 max-w-md font-base text-sm leading-6 text-graphite">{descripcion}</p> : null}
      {accion ? (
        <Button type="button" size="sm" variant="ghost" onClick={accion.onClick} className="mt-4">
          {accion.label}
        </Button>
      ) : null}
    </div>
  );
}
