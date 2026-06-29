import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cotizacion, ResultadoCascada } from "@/types/cotizaciones";
import type { Lead } from "@/types/leads";

export const maxDuration = 30;

type RouteContext = {
  params: {
    id: string;
  };
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string) {
  return UUID_REGEX.test(value);
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function toIsoDateOnly(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatAcceptanceDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(date);
}

async function safeDeleteById(
  supabase: ReturnType<typeof createAdminClient>,
  table: "features" | "cobros" | "suscripciones" | "proyectos" | "clientes",
  id: string
) {
  await supabase.from(table).delete().eq("id", id);
}

async function rollbackCascade(params: {
  supabase: ReturnType<typeof createAdminClient>;
  leadId: string | null;
  previousLead: Pick<Lead, "etapa" | "notas"> | null;
  created: {
    featureIds: string[];
    cobroIds: string[];
    suscripcionId: string | null;
    proyectoId: string | null;
    clienteId: string | null;
    createdCliente: boolean;
  };
}) {
  const { supabase, leadId, previousLead, created } = params;

  for (const featureId of [...created.featureIds].reverse()) {
    await safeDeleteById(supabase, "features", featureId);
  }

  for (const cobroId of [...created.cobroIds].reverse()) {
    await safeDeleteById(supabase, "cobros", cobroId);
  }

  if (created.suscripcionId) {
    await safeDeleteById(supabase, "suscripciones", created.suscripcionId);
  }

  if (created.proyectoId) {
    await safeDeleteById(supabase, "proyectos", created.proyectoId);
  }

  if (created.createdCliente && created.clienteId) {
    await safeDeleteById(supabase, "clientes", created.clienteId);
  }

  if (leadId && previousLead) {
    await supabase
      .from("leads")
      .update({
        etapa: previousLead.etapa,
        notas: previousLead.notas
      })
      .eq("id", leadId);
  }
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  let supabase: ReturnType<typeof createAdminClient> | null = null;
  let currentStep = "validación inicial";
  let leadIdForRollback: string | null = null;
  let previousLead: Pick<Lead, "etapa" | "notas"> | null = null;
  let mutating = false;
  let currentCotizacion: Cotizacion | null = null;
  let proyectoToken = "";
  const created = {
    featureIds: [] as string[],
    cobroIds: [] as string[],
    suscripcionId: null as string | null,
    proyectoId: null as string | null,
    clienteId: null as string | null,
    createdCliente: false
  };

  const fail = async (message: string, status = 500) => {
    if (mutating && supabase) {
      await rollbackCascade({
        supabase,
        leadId: leadIdForRollback,
        previousLead,
        created
      });
    }

    return NextResponse.json({ error: message }, { status });
  };

  try {
    supabase = createAdminClient();

    if (!isValidUuid(params.id)) {
      return NextResponse.json({ error: "ID de cotización inválido." }, { status: 400 });
    }

    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    currentStep = "carga de cotización";
    const { data: cotizacion, error: cotizacionError } = await supabase
      .from("cotizaciones")
      .select("*")
      .eq("id", params.id)
      .single();

    if (cotizacionError) {
      const status = cotizacionError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: cotizacionError.message }, { status });
    }

    if (!cotizacion) {
      return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
    }

    currentCotizacion = cotizacion as Cotizacion;

    if (currentCotizacion.estado === "aceptada") {
      return NextResponse.json({ error: "La cotización ya fue aceptada." }, { status: 400 });
    }

    if (!["borrador", "enviada"].includes(currentCotizacion.estado)) {
      return NextResponse.json(
        { error: "La cotización debe estar en borrador o enviada para aceptarse." },
        { status: 400 }
      );
    }

    if (
      currentCotizacion.empresa.trim().length === 0 ||
      !(currentCotizacion.precio_total ?? 0) ||
      currentCotizacion.modulos.length === 0 ||
      currentCotizacion.hitos.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "La cotización necesita empresa, precio total, módulos y hitos para poder aceptarse."
        },
        { status: 400 }
      );
    }

    if (currentCotizacion.lead_id) {
      leadIdForRollback = currentCotizacion.lead_id;

      currentStep = "lectura de lead";
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("etapa, notas")
        .eq("id", currentCotizacion.lead_id)
        .single();

      if (leadError) {
        return await fail(leadError.message, leadError.code === "PGRST116" ? 404 : 500);
      }

      if (!lead) {
        return await fail("Lead asociado no encontrado.", 404);
      }

      previousLead = lead as Pick<Lead, "etapa" | "notas">;

      currentStep = "actualización de lead";
      const ganadaMessage = `[Ganado] Cotización aceptada el ${formatAcceptanceDate(new Date())}`;
      const nextNotes = [ganadaMessage, previousLead.notas?.trim() ?? ""]
        .filter((value) => value.length > 0)
        .join("\n");

      const { error: leadUpdateError } = await supabase
        .from("leads")
        .update({
          etapa: "cotizacion",
          notas: nextNotes
        })
        .eq("id", currentCotizacion.lead_id);

      if (leadUpdateError) {
        return await fail(leadUpdateError.message);
      }

      mutating = true;
    }

    currentStep = "cliente";
    let clienteId = currentCotizacion.cliente_id;

    if (clienteId) {
      const { data: existingCliente, error: clienteError } = await supabase
        .from("clientes")
        .select("id")
        .eq("id", clienteId)
        .single();

      if (clienteError) {
        return await fail(clienteError.message, clienteError.code === "PGRST116" ? 404 : 500);
      }

      if (!existingCliente) {
        return await fail("El cliente asociado no existe.", 404);
      }
    } else {
      let leadForClient: Lead | null = null;

      if (currentCotizacion.lead_id) {
        const { data: leadData, error: leadDataError } = await supabase
          .from("leads")
          .select("*")
          .eq("id", currentCotizacion.lead_id)
          .single();

        if (leadDataError) {
          return await fail(leadDataError.message, leadDataError.code === "PGRST116" ? 404 : 500);
        }

        if (!leadData) {
          return await fail("Lead asociado no encontrado.", 404);
        }

        leadForClient = leadData as Lead;
      }

      currentStep = "creación de cliente";
      const clientePayload = {
        lead_id: currentCotizacion.lead_id,
        empresa: currentCotizacion.empresa,
        pais: null,
        contacto_nombre: leadForClient?.contacto_1_nombre ?? null,
        contacto_email: null,
        contacto_whatsapp: leadForClient?.contacto_1_tel ?? null,
        datos_facturacion: null,
        estado: "activo" as const,
        notas: null
      };

      const { data: createdCliente, error: createdClienteError } = await supabase
        .from("clientes")
        .insert(clientePayload)
        .select("id")
        .single();

      if (createdClienteError) {
        return await fail(createdClienteError.message);
      }

      if (!createdCliente) {
        return await fail("No se pudo crear el cliente.");
      }

      clienteId = createdCliente.id;
      created.clienteId = clienteId;
      created.createdCliente = true;
      mutating = true;
    }

    if (!clienteId) {
      return await fail("No se pudo resolver el cliente.");
    }

    currentStep = "creación de proyecto";
    const today = startOfUtcDay(new Date());
    const plazoSemanas = Math.max(currentCotizacion.plazo_semanas ?? 0, 1);
    proyectoToken = crypto.randomUUID();
    const proyectoPayload = {
      cotizacion_id: currentCotizacion.id,
      cliente_id: clienteId,
      nombre: `${currentCotizacion.empresa} - Sistema`,
      estado: "por_empezar" as const,
      responsable_id: currentUser.id,
      devs_asignados: [] as string[],
      fecha_inicio: toIsoDateOnly(today),
      entrega_comprometida: toIsoDateOnly(addUtcDays(today, plazoSemanas * 7)),
      entrega_real: null,
      avance_pct: 0,
      valor_total: currentCotizacion.precio_total,
      notas_arquitectura: "",
      roadmap_token: proyectoToken,
      roadmap_publico_activo: true
    };

    const { data: proyecto, error: proyectoError } = await supabase
      .from("proyectos")
      .insert(proyectoPayload)
      .select("id")
      .single();

    if (proyectoError) {
      return await fail(proyectoError.message);
    }

    if (!proyecto) {
      return await fail("No se pudo crear el proyecto.");
    }

    const proyectoId = proyecto.id;
    created.proyectoId = proyectoId;
    mutating = true;

    currentStep = "creación de features";
    let featureOrder = 0;

    for (const modulo of currentCotizacion.modulos) {
      const featuresToCreate = modulo.features.length > 0 ? modulo.features : [modulo.nombre];

      for (const featureName of featuresToCreate) {
        const { data: feature, error: featureError } = await supabase
          .from("features")
          .insert({
            proyecto_id: proyectoId,
            nombre: featureName,
            descripcion: modulo.descripcion,
            fase: modulo.nombre,
            estado: "pendiente",
            responsable_id: currentUser.id,
            orden: featureOrder
          })
          .select("id")
          .single();

        if (featureError) {
          return await fail(featureError.message);
        }

        if (feature?.id) {
          created.featureIds.push(feature.id);
        }

        featureOrder += 1;
      }
    }

    currentStep = "creación de suscripción";
    let suscripcionId: string | null = null;

    if ((currentCotizacion.mantenimiento_mensual ?? 0) > 0) {
      const { data: suscripcion, error: suscripcionError } = await supabase
        .from("suscripciones")
        .insert({
          cliente_id: clienteId,
          proyecto_id: proyectoId,
          cotizacion_id: currentCotizacion.id,
          tipo: "mantenimiento",
          monto_mensual: currentCotizacion.mantenimiento_mensual ?? 0,
          ciclo: "mensual",
          fecha_inicio: null,
          proxima_cobro: null,
          estado: "pendiente",
          fecha_baja: null,
          motivo_baja: null
        })
        .select("id")
        .single();

      if (suscripcionError) {
        return await fail(suscripcionError.message);
      }

      if (suscripcion?.id) {
        suscripcionId = suscripcion.id;
        created.suscripcionId = suscripcionId;
      }
    }

    currentStep = "creación de cobros";
    const totalDays = plazoSemanas * 7;

    for (const [index, hito] of currentCotizacion.hitos.entries()) {
      const dueOffsetDays =
        currentCotizacion.hitos.length === 1
          ? 0
          : Math.round((index / Math.max(currentCotizacion.hitos.length - 1, 1)) * totalDays);

      const { data: cobro, error: cobroError } = await supabase
        .from("cobros")
        .insert({
          cliente_id: clienteId,
          proyecto_id: proyectoId,
          suscripcion_id: null,
          cotizacion_id: currentCotizacion.id,
          concepto: hito.nombre,
          tipo: "hito",
          monto: hito.monto,
          fecha_emision: toIsoDateOnly(today),
          fecha_vencimiento: toIsoDateOnly(addUtcDays(today, dueOffsetDays)),
          fecha_cobro: null,
          estado: "pendiente"
        })
        .select("id")
        .single();

      if (cobroError) {
        return await fail(cobroError.message);
      }

      if (cobro?.id) {
        created.cobroIds.push(cobro.id);
      }
    }

    currentStep = "actualización de cotización";
    const { error: cotizacionUpdateError } = await supabase
      .from("cotizaciones")
      .update({
        estado: "aceptada",
        cliente_id: clienteId
      })
      .eq("id", currentCotizacion.id);

    if (cotizacionUpdateError) {
      return await fail(cotizacionUpdateError.message);
    }

    const responsePayload: { data: ResultadoCascada } = {
      data: {
        cliente_id: clienteId,
        proyecto_id: proyectoId,
        roadmap_token: proyectoToken,
        cobros_creados: created.cobroIds.length,
        suscripcion_id: suscripcionId
      }
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    if (mutating && supabase) {
      await rollbackCascade({
        supabase,
        leadId: leadIdForRollback,
        previousLead,
        created
      });
    }

    const message =
      error instanceof Error ? error.message : `Falló la cascada en el paso ${currentStep}.`;

    return NextResponse.json(
      {
        error: `Falló la cascada en el paso ${currentStep}: ${message}`
      },
      { status: 500 }
    );
  }
}
