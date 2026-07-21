import { ModulosCatalogoClient } from "@/components/diagnostico/ModulosCatalogoClient";

export default function ModulosCatalogoPage() {
  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-title text-carbon">Catálogo de módulos</h1>
        <p className="mt-2 max-w-2xl text-sm text-graphite">
          Módulos base para transformar el diagnóstico de un lead en informe y propuesta comercial.
        </p>
      </section>

      <ModulosCatalogoClient />
    </div>
  );
}
