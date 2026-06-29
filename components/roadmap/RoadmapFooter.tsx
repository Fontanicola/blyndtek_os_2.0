import { formatFecha } from "@/lib/utils/formatters";

type RoadmapFooterProps = {
  ultimaActualizacion: string | null;
};

export function RoadmapFooter({ ultimaActualizacion }: RoadmapFooterProps) {
  return (
    <footer className="border-t border-line-soft pt-6 text-center">
      <p className="text-sm font-label text-carbon">Powered by Blyndtek</p>
      <p className="mt-2 text-xs text-graphite">
        {ultimaActualizacion
          ? `Última actualización: ${formatFecha(ultimaActualizacion)}`
          : "Última actualización pendiente"}
      </p>
    </footer>
  );
}
