import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { crearTareaVinculadaAFeature } from "@/lib/proyectos/featureTarea";

type FeatureRecord = {
  id: string;
  proyecto_id: string;
  nombre: string;
  descripcion: string;
  fase_id: string;
  estado: "pendiente" | "en_curso" | "lista";
  responsable_id: string | null;
  orden: number;
  proyectos: {
    responsable_id: string | null;
  } | null;
};

export async function POST() {
  try {
    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data: features, error: featuresError } = await supabase
      .from("features")
      .select(
        `
          id,
          proyecto_id,
          nombre,
          descripcion,
          fase_id,
          estado,
          responsable_id,
          orden,
          proyectos (
            responsable_id
          )
        `
      )
      .order("proyecto_id", { ascending: true })
      .order("fase_id", { ascending: true })
      .order("orden", { ascending: true });

    if (featuresError) {
      return NextResponse.json({ error: featuresError.message }, { status: 500 });
    }

    const featureRows = (features ?? []) as FeatureRecord[];
    if (featureRows.length === 0) {
      return NextResponse.json({ data: { tareas_creadas: 0 } });
    }

    const featureIds = featureRows.map((feature) => feature.id);
    const { data: taskRows, error: taskRowsError } = await supabase
      .from("tareas")
      .select("feature_id")
      .in("feature_id", featureIds);

    if (taskRowsError) {
      return NextResponse.json({ error: taskRowsError.message }, { status: 500 });
    }

    const linkedFeatureIds = new Set((taskRows ?? []).map((task) => task.feature_id).filter(Boolean));
    const missingFeatures = featureRows.filter((feature) => !linkedFeatureIds.has(feature.id));

    let tareasCreadas = 0;

    for (const feature of missingFeatures) {
      try {
        await crearTareaVinculadaAFeature(supabase, feature);
        tareasCreadas += 1;
      } catch (error) {
        console.error(
          `No se pudo crear la tarea para la feature ${feature.id}:`,
          error instanceof Error ? error.message : "Unexpected task error"
        );
      }
    }

    return NextResponse.json({ data: { tareas_creadas: tareasCreadas } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
