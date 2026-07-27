import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureCarpetaAutomaticaProyecto } from "@/lib/carpetas";
import {
  parseCondicionesComerciales,
  parseModulos,
  parsePropuestaSoftware,
  construirHitosPago,
  type CondicionesComercialesPropuesta
} from "@/lib/diagnostico/informe";
import { crearTareaVinculadaAFeature } from "@/lib/proyectos/featureTarea";
import { generarSlugRoadmap } from "@/lib/proyectos/generarSlug";
import { hoyLocalString } from "@/lib/utils/fechas";
import type { Lead } from "@/types/leads";
import type { Database, Json } from "@/types/supabase";

type AdminClient = SupabaseClient<Database>;

type MaterializarPropuestaParams = {
  lead: Lead;
  clienteId: string;
  responsableId: string;
  precioDesarrollo: number;
  precioMensual: number;
  condicionesOverride?: Partial<CondicionesComercialesPropuesta>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asJson(value: unknown): Json {
  return value as Json;
}

async function generarRoadmapSlugUnico(supabase: AdminClient, empresa: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generarSlugRoadmap(empresa);
    const { data, error } = await supabase.from("proyectos").select("id").eq("roadmap_slug", candidate).maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return candidate;
    }
  }

  throw new Error("No se pudo generar un slug único para el roadmap.");
}

function getModulosPayload(diagnostico: { modulos_sugeridos: unknown }) {
  return isRecord(diagnostico.modulos_sugeridos) ? diagnostico.modulos_sugeridos : {};
}

async function fetchDiagnosticoGenerado(supabase: AdminClient, leadId: string) {
  const { data, error } = await supabase
    .from("diagnosticos")
    .select("id, modulos_sugeridos, precio_ideal_desarrollo, precio_ideal_mensual")
    .eq("lead_id", leadId)
    .eq("estado", "informe_generado")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function obtenerCondicionesDiagnostico(
  supabase: AdminClient,
  leadId: string,
  fallbackDesarrollo: number,
  fallbackMensual: number
) {
  const diagnostico = await fetchDiagnosticoGenerado(supabase, leadId);

  if (!diagnostico) {
    return parseCondicionesComerciales(null, fallbackDesarrollo, fallbackMensual);
  }

  const payload = getModulosPayload(diagnostico);

  return parseCondicionesComerciales(
    payload.condiciones_comerciales,
    Number(diagnostico.precio_ideal_desarrollo ?? fallbackDesarrollo),
    Number(diagnostico.precio_ideal_mensual ?? fallbackMensual)
  );
}

export async function materializarPropuestaDiagnostico(
  supabase: AdminClient,
  {
    lead,
    clienteId,
    responsableId,
    precioDesarrollo,
    precioMensual,
    condicionesOverride
  }: MaterializarPropuestaParams
) {
  const diagnostico = await fetchDiagnosticoGenerado(supabase, lead.id);

  if (!diagnostico) {
    return null;
  }

  const payload = getModulosPayload(diagnostico);
  const modulos = parseModulos(payload.modulos);
  const propuesta = parsePropuestaSoftware(payload.propuesta_software, modulos);
  const condiciones = {
    ...parseCondicionesComerciales(
      payload.condiciones_comerciales,
      Number(diagnostico.precio_ideal_desarrollo ?? precioDesarrollo),
      Number(diagnostico.precio_ideal_mensual ?? precioMensual)
    ),
    ...condicionesOverride,
    precio_desarrollo_usd: precioDesarrollo,
    mantenimiento_mensual_usd: precioMensual
  };
  const hitosPago = construirHitosPago(condiciones, propuesta.roadmap_implementacion);
  const created = {
    cotizacionId: null as string | null,
    cotizacionCreada: false,
    proyectoId: null as string | null,
    faseIds: [] as string[],
    featureIds: [] as string[],
    tareaIds: [] as string[]
  };

  try {
    const { data: existingCotizacion, error: existingCotizacionError } = await supabase
      .from("cotizaciones")
      .select("id")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingCotizacionError) {
      throw new Error(existingCotizacionError.message);
    }

    const cotizacionPayload = {
      lead_id: lead.id,
      cliente_id: clienteId,
      empresa: lead.empresa,
      precio_total: precioDesarrollo,
      mantenimiento_mensual: precioMensual > 0 ? precioMensual : null,
      plazo_semanas:
        modulos.reduce((total, modulo) => total + Number(modulo.tiempo_estimado_semanas ?? 0), 0) || null,
      hitos: asJson(
        propuesta.roadmap_implementacion.map((etapa, index) => ({
          nombre: etapa.etapa,
          descripcion: etapa.descripcion,
          duracion_estimada: etapa.duracion_estimada,
          orden: index + 1,
          subtareas: etapa.subtareas,
          entregables: etapa.entregables,
          criterio_aceptacion: etapa.criterio_aceptacion,
          responsable_cliente: etapa.responsable_cliente
        }))
      ),
      modulos: asJson(modulos),
      entendimiento: propuesta.alcance_general,
      beneficios: asJson(propuesta.beneficios_esperados),
      supuestos: asJson(propuesta.supuestos),
      condiciones_comerciales: asJson({ ...condiciones, hitos_pago: hitosPago }),
      datos_propuesta: asJson({ diagnostico_id: diagnostico.id, origen: "diagnostico" }),
      resumen_ejecutivo: propuesta.vision_sistema,
      estado: "aceptada" as const
    };

    const cotizacionId = existingCotizacion?.id;

    if (cotizacionId) {
      const { error } = await supabase.from("cotizaciones").update(cotizacionPayload).eq("id", cotizacionId);

      if (error) {
        throw new Error(error.message);
      }

      created.cotizacionId = cotizacionId;
    } else {
      const { data, error } = await supabase.from("cotizaciones").insert(cotizacionPayload).select("id").single();

      if (error || !data) {
        throw new Error(error?.message ?? "No se pudo crear la cotización de la propuesta.");
      }

      created.cotizacionId = data.id;
      created.cotizacionCreada = true;
    }

    const { data: existingProyecto, error: existingProyectoError } = await supabase
      .from("proyectos")
      .select("id")
      .eq("cotizacion_id", created.cotizacionId)
      .maybeSingle();

    if (existingProyectoError) {
      throw new Error(existingProyectoError.message);
    }

    if (existingProyecto?.id) {
      return { cotizacionId: created.cotizacionId, proyectoId: existingProyecto.id, hitosPago };
    }

    const roadmapSlug = await generarRoadmapSlugUnico(supabase, lead.empresa);
    const { data: proyecto, error: proyectoError } = await supabase
      .from("proyectos")
      .insert({
        cotizacion_id: created.cotizacionId,
        cliente_id: clienteId,
        nombre: `Sistema ${lead.empresa}`,
        estado: "por_empezar",
        responsable_id: responsableId,
        devs_asignados: [],
        fecha_inicio: hoyLocalString(),
        entrega_comprometida: null,
        entrega_real: null,
        avance_pct: 0,
        valor_total: precioDesarrollo,
        notas_arquitectura: propuesta.alcance_general,
        roadmap_token: crypto.randomUUID(),
        roadmap_slug: roadmapSlug,
        roadmap_publico_activo: true
      })
      .select("id, nombre")
      .single();

    if (proyectoError || !proyecto) {
      throw new Error(proyectoError?.message ?? "No se pudo crear el proyecto desde la propuesta.");
    }

    created.proyectoId = proyecto.id;

    try {
      await ensureCarpetaAutomaticaProyecto(supabase, {
        id: proyecto.id,
        nombre: proyecto.nombre
      });
    } catch (folderError) {
      const message = folderError instanceof Error ? folderError.message : "Unexpected folder error";
      console.error("No se pudo crear la carpeta automática del proyecto desde diagnóstico:", message);
    }

    for (const [faseIndex, etapa] of propuesta.roadmap_implementacion.entries()) {
      const { data: fase, error: faseError } = await supabase
        .from("fases_proyecto")
        .insert({
          proyecto_id: proyecto.id,
          nombre: etapa.etapa,
          descripcion: etapa.descripcion,
          estado: "pendiente",
          prioridad: faseIndex === 0 ? "alta" : "media",
          orden: faseIndex + 1
        })
        .select("id")
        .single();

      if (faseError || !fase) {
        throw new Error(faseError?.message ?? "No se pudo crear una fase del roadmap.");
      }

      created.faseIds.push(fase.id);

      const subtareas = etapa.subtareas.length > 0 ? etapa.subtareas : [etapa.descripcion];

      for (const [featureIndex, subtarea] of subtareas.entries()) {
        const { data: feature, error: featureError } = await supabase
          .from("features")
          .insert({
            proyecto_id: proyecto.id,
            fase_id: fase.id,
            nombre: subtarea.slice(0, 120),
            descripcion: subtarea,
            estado: "pendiente",
            responsable_id: responsableId,
            orden: featureIndex + 1
          })
          .select("id, nombre, descripcion, fase_id, estado, responsable_id, proyecto_id")
          .single();

        if (featureError || !feature) {
          throw new Error(featureError?.message ?? "No se pudo crear una subtarea del roadmap.");
        }

        created.featureIds.push(feature.id);

        const tarea = await crearTareaVinculadaAFeature(supabase, feature);
        created.tareaIds.push(tarea.id);
      }
    }

    return { cotizacionId: created.cotizacionId, proyectoId: created.proyectoId, hitosPago };
  } catch (error) {
    if (created.tareaIds.length > 0) {
      await supabase.from("tareas").delete().in("id", created.tareaIds);
    }

    if (created.featureIds.length > 0) {
      await supabase.from("features").delete().in("id", created.featureIds);
    }

    if (created.faseIds.length > 0) {
      await supabase.from("fases_proyecto").delete().in("id", created.faseIds);
    }

    if (created.proyectoId) {
      await supabase.from("proyectos").delete().eq("id", created.proyectoId);
    }

    if (created.cotizacionCreada && created.cotizacionId) {
      await supabase.from("cotizaciones").delete().eq("id", created.cotizacionId);
    }

    throw error;
  }
}
