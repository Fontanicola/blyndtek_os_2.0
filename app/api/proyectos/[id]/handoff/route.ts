import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DeliveryHandoff, DeliveryHandoffPhase } from "@/types/entrega";

type RouteContext = { params: { id: string } };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBenefits(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item === "string" && item.trim()) {
      return [item.trim()];
    }

    if (isRecord(item) && typeof item.titulo === "string") {
      return [item.descripcion ? `${item.titulo}: ${item.descripcion}` : item.titulo];
    }

    return [];
  });
}

function parseModulos(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.nombre !== "string") {
      return [];
    }

    return [{ nombre: item.nombre, descripcion: stringValue(item.descripcion) }];
  });
}

function parseConditions(value: unknown) {
  if (!isRecord(value)) {
    return {
      precio_desarrollo: null,
      mantenimiento_mensual: null,
      adelanto_pct: null,
      cantidad_cuotas: null
    };
  }

  return {
    precio_desarrollo: numberValue(value.precio_desarrollo_usd),
    mantenimiento_mensual: numberValue(value.mantenimiento_mensual_usd),
    adelanto_pct: numberValue(value.adelanto_pct),
    cantidad_cuotas: numberValue(value.cantidad_cuotas)
  };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createAdminClient();
    const { data: proyecto, error: proyectoError } = await supabase
      .from("proyectos")
      .select("id, nombre, estado, cliente_id, cotizacion_id, responsable_id, devs_asignados, fecha_inicio, entrega_comprometida, roadmap_slug, roadmap_token")
      .eq("id", params.id)
      .single();

    if (proyectoError || !proyecto) {
      return NextResponse.json({ error: proyectoError?.message ?? "Proyecto no encontrado." }, { status: proyectoError?.code === "PGRST116" ? 404 : 500 });
    }

    const [{ data: cliente }, { data: cotizacion }, { data: fases, error: fasesError }, { data: features, error: featuresError }, { data: tareas, error: tareasError }, { data: contrato }, { data: cobros }] = await Promise.all([
      supabase.from("clientes").select("id, empresa").eq("id", proyecto.cliente_id).maybeSingle(),
      proyecto.cotizacion_id
        ? supabase.from("cotizaciones").select("id, estado, entendimiento, resumen_ejecutivo, modulos, hitos, beneficios, condiciones_comerciales").eq("id", proyecto.cotizacion_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from("fases_proyecto").select("id, nombre, descripcion, orden, estado").eq("proyecto_id", params.id).order("orden", { ascending: true }),
      supabase.from("features").select("id, fase_id, estado").eq("proyecto_id", params.id),
      supabase.from("tareas").select("id, feature_id, estado").eq("proyecto_id", params.id),
      supabase.from("contratos").select("id, estado, valor_total, descuento_diagnostico_usd").eq("cliente_id", proyecto.cliente_id).eq("estado", "activo").maybeSingle(),
      supabase.from("cobros").select("id").eq("cliente_id", proyecto.cliente_id).eq("estado", "pendiente")
    ]);

    if (fasesError || featuresError || tareasError) {
      throw new Error(fasesError?.message ?? featuresError?.message ?? tareasError?.message ?? "No se pudo cargar la estructura del proyecto.");
    }

    const userIds = [proyecto.responsable_id, ...(Array.isArray(proyecto.devs_asignados) ? proyecto.devs_asignados : [])].filter(
      (id): id is string => typeof id === "string" && id.length > 0
    );
    const { data: usuarios } = userIds.length > 0
      ? await supabase.from("usuarios").select("id, nombre").in("id", [...new Set(userIds)])
      : { data: [] };
    const userMap = new Map((usuarios ?? []).map((usuario) => [usuario.id, usuario.nombre]));
    const featureRows = features ?? [];
    const taskRows = tareas ?? [];
    const quoteHitos = Array.isArray(cotizacion?.hitos) ? cotizacion.hitos : [];

    const phases: DeliveryHandoffPhase[] = (fases ?? []).map((fase) => {
      const phaseFeatures = featureRows.filter((feature) => feature.fase_id === fase.id);
      const phaseTasks = taskRows.filter((task) => phaseFeatures.some((feature) => feature.id === task.feature_id));
      const hito = quoteHitos.find((item) => isRecord(item) && item.orden === fase.orden);
      return {
        id: fase.id,
        nombre: fase.nombre,
        descripcion: fase.descripcion,
        orden: fase.orden,
        estado: fase.estado,
        features_total: phaseFeatures.length,
        tareas_total: phaseTasks.length,
        features_completadas: phaseFeatures.filter((feature) => feature.estado === "lista").length,
        criterio_aceptacion: isRecord(hito) ? stringValue(hito.criterio_aceptacion) : null,
        responsable_cliente: isRecord(hito) ? stringValue(hito.responsable_cliente) : null
      };
    });

    const condiciones = parseConditions(cotizacion?.condiciones_comerciales);
    const checklist = [
      { clave: "proposal", label: "Propuesta aceptada", completo: cotizacion?.estado === "aceptada", detalle: cotizacion?.estado ?? "Sin cotización vinculada" },
      { clave: "contract", label: "Contrato activo", completo: Boolean(contrato), detalle: contrato ? "Contrato activo creado" : "Falta generar o activar el contrato" },
      { clave: "owner", label: "Responsable de delivery", completo: Boolean(proyecto.responsable_id), detalle: proyecto.responsable_id ? userMap.get(proyecto.responsable_id) ?? "Responsable asignado" : "Asigná un responsable" },
      { clave: "team", label: "Equipo técnico asignado", completo: Array.isArray(proyecto.devs_asignados) && proyecto.devs_asignados.length > 0, detalle: `${Array.isArray(proyecto.devs_asignados) ? proyecto.devs_asignados.length : 0} devs asignados` },
      { clave: "roadmap", label: "Roadmap materializado", completo: phases.length > 0 && featureRows.length > 0, detalle: `${phases.length} fases · ${featureRows.length} features · ${taskRows.length} tareas` },
      { clave: "start", label: "Inicio definido", completo: Boolean(proyecto.fecha_inicio), detalle: proyecto.fecha_inicio ?? "Definí la fecha de inicio" }
    ];
    const pendientes = checklist.filter((item) => !item.completo).map((item) => item.detalle);
    const devIds = Array.isArray(proyecto.devs_asignados) ? proyecto.devs_asignados.filter((id): id is string => typeof id === "string") : [];
    const handoff: DeliveryHandoff = {
      proyecto: {
        id: proyecto.id,
        nombre: proyecto.nombre,
        estado: proyecto.estado,
        responsable: proyecto.responsable_id ? { id: proyecto.responsable_id, nombre: userMap.get(proyecto.responsable_id) ?? "Sin nombre" } : null,
        devs: devIds.map((id) => ({ id, nombre: userMap.get(id) ?? "Sin nombre" })),
        fecha_inicio: proyecto.fecha_inicio,
        entrega_comprometida: proyecto.entrega_comprometida,
        roadmap_url: proyecto.roadmap_slug ?? proyecto.roadmap_token
      },
      cliente: cliente ? { id: cliente.id, empresa: cliente.empresa } : null,
      propuesta: {
        id: cotizacion?.id ?? null,
        aceptada: cotizacion?.estado === "aceptada",
        alcance: cotizacion?.entendimiento ?? null,
        resumen: cotizacion?.resumen_ejecutivo ?? null,
        modulos: parseModulos(cotizacion?.modulos),
        beneficios: parseBenefits(cotizacion?.beneficios),
        condiciones
      },
      contrato: {
        existe: Boolean(contrato),
        estado: contrato?.estado ?? null,
        valor_total: numberValue(contrato?.valor_total),
        descuento_diagnostico_usd: numberValue(contrato?.descuento_diagnostico_usd) ?? 0,
        cobros_pendientes: cobros?.length ?? 0
      },
      fases: phases,
      checklist,
      pendientes,
      status: pendientes.length === 0 ? "ready" : "attention"
    };

    return NextResponse.json({ data: handoff });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar el handoff de delivery.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
