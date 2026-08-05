import type { SupabaseClient } from "@supabase/supabase-js";
import { addMonths, formatMonthKey, formatMonthLabel, startOfMonth } from "@/lib/finanzas";
import { hoyLocalString } from "@/lib/utils/fechas";
import type { Caja } from "@/types/cajas";
import type {
  CategoriaEgresoRecurrente,
  CreateEgresoInput,
  Egreso,
  EgresoRecurrenteConfig,
  UpdateEgresoInput
} from "@/types/egresos";
import type { Database } from "@/types/supabase";

type FinanzasClient = SupabaseClient<Database>;

type RecurrentePayload = {
  concepto: string;
  categoria: CategoriaEgresoRecurrente;
  monto: number;
  fecha: string;
  cliente_id?: string | null;
  proyecto_id?: string | null;
  caja_id?: string | null;
  cuenta_medio?: string | null;
};

export type GeneracionEgresosMesResult = {
  month: string;
  configs: number;
  generados: number;
  existentes: number;
};

function clampDiaPago(value: number) {
  const day = Number(value);
  if (!Number.isFinite(day)) {
    return 1;
  }

  return Math.min(28, Math.max(1, Math.round(day)));
}

export function getMonthDate(month?: string | null) {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year = NaN, monthValue = NaN] = month.split("-").map(Number);
    return new Date(year, monthValue - 1, 1);
  }

  return startOfMonth(new Date());
}

export function getMonthKey(month?: string | null) {
  return formatMonthKey(getMonthDate(month));
}

export function buildEgresoDateForMonth(month: string, diaPago: number) {
  const monthDate = getMonthDate(month);
  return hoyLocalString(new Date(monthDate.getFullYear(), monthDate.getMonth(), clampDiaPago(diaPago)));
}

export function isEgresoInMonth(fecha: string | null | undefined, month: string) {
  return Boolean(fecha?.startsWith(`${month}-`));
}

export function getMonthHistoryItems(
  baseMonth: string,
  instances: Egreso[],
  recurrenteConfigId: string,
  months = 12
) {
  const monthDate = getMonthDate(baseMonth);

  return Array.from({ length: months }, (_value, index) => {
    const currentDate = addMonths(monthDate, -(months - index - 1));
    const month = formatMonthKey(currentDate);
    const instance = instances.find((egreso) => egreso.recurrente_config_id === recurrenteConfigId && isEgresoInMonth(egreso.fecha, month));

    return {
      month,
      label: formatMonthLabel(currentDate),
      pagado: Boolean(instance?.pagado),
      exists: Boolean(instance),
      egreso_id: instance?.id ?? null
    };
  });
}

async function getCajaBySlug(supabase: FinanzasClient, slug: string | null | undefined) {
  if (!slug) {
    return null;
  }

  const { data, error } = await supabase.from("cajas").select("id, nombre, slug, color, activa, orden, created_at").eq("slug", slug).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as Caja | null;
}

async function getCajaById(supabase: FinanzasClient, id: string | null | undefined) {
  if (!id) {
    return null;
  }

  const { data, error } = await supabase.from("cajas").select("id, nombre, slug, color, activa, orden, created_at").eq("id", id).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as Caja | null;
}

export async function createRecurrenteConfig(
  supabase: FinanzasClient,
  payload: RecurrentePayload
) {
  const caja = payload.caja_id
    ? await getCajaById(supabase, payload.caja_id)
    : await getCajaBySlug(supabase, payload.cuenta_medio ?? null);
  const diaPago = clampDiaPago(new Date(`${payload.fecha}T00:00:00`).getDate());

  let existingQuery = supabase
    .from("egresos_recurrentes_config")
    .select("*")
    .eq("concepto", payload.concepto)
    .eq("categoria", payload.categoria)
    .eq("monto", payload.monto)
    .eq("dia_pago", diaPago)
    .eq("fecha_inicio", payload.fecha)
    .eq("activo", true);

  existingQuery = payload.caja_id
    ? existingQuery.eq("caja_id", payload.caja_id)
    : existingQuery.is("caja_id", null);
  existingQuery = payload.cliente_id
    ? existingQuery.eq("cliente_id", payload.cliente_id)
    : existingQuery.is("cliente_id", null);
  existingQuery = payload.proyecto_id
    ? existingQuery.eq("proyecto_id", payload.proyecto_id)
    : existingQuery.is("proyecto_id", null);

  const { data: existing } = await existingQuery.order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (existing) {
    return existing as EgresoRecurrenteConfig;
  }

  const { data, error } = await supabase
    .from("egresos_recurrentes_config")
    .insert({
      concepto: payload.concepto,
      categoria: payload.categoria,
      monto: payload.monto,
      cliente_id: payload.cliente_id ?? null,
      proyecto_id: payload.proyecto_id ?? null,
      caja_id: caja?.id ?? null,
      dia_pago: diaPago,
      activo: true,
      fecha_inicio: payload.fecha
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear la configuración recurrente.");
  }

  return data as EgresoRecurrenteConfig;
}

export async function updateRecurrenteConfig(
  supabase: FinanzasClient,
  configId: string,
  payload: Partial<RecurrentePayload>
) {
  const updatePayload: Database["public"]["Tables"]["egresos_recurrentes_config"]["Update"] = {};

  if (payload.concepto != null) {
    updatePayload.concepto = payload.concepto;
  }
  if (payload.categoria != null) {
    updatePayload.categoria = payload.categoria;
  }
  if (payload.monto != null) {
    updatePayload.monto = payload.monto;
  }
  if (payload.cliente_id !== undefined) {
    updatePayload.cliente_id = payload.cliente_id;
  }
  if (payload.proyecto_id !== undefined) {
    updatePayload.proyecto_id = payload.proyecto_id;
  }
  if (payload.fecha) {
    updatePayload.fecha_inicio = payload.fecha;
    updatePayload.dia_pago = clampDiaPago(new Date(`${payload.fecha}T00:00:00`).getDate());
  }
  if (payload.caja_id !== undefined || payload.cuenta_medio !== undefined) {
    const caja = payload.caja_id
      ? await getCajaById(supabase, payload.caja_id)
      : await getCajaBySlug(supabase, payload.cuenta_medio ?? null);
    updatePayload.caja_id = caja?.id ?? null;
  }

  const { data, error } = await supabase
    .from("egresos_recurrentes_config")
    .update(updatePayload)
    .eq("id", configId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo actualizar la configuración recurrente.");
  }

  return data as EgresoRecurrenteConfig;
}

export async function ensureEgresoRecurrenteInstance(
  supabase: FinanzasClient,
  config: EgresoRecurrenteConfig,
  month: string,
  options?: {
    forcePagado?: boolean;
    fechaPago?: string | null;
  }
) {
  const monthStart = `${month}-01`;
  const nextMonthStart = hoyLocalString(addMonths(getMonthDate(month), 1));
  const { data: existing, error: existingError } = await supabase
    .from("egresos")
    .select("*")
    .eq("recurrente_config_id", config.id)
    .gte("fecha", monthStart)
    .lt("fecha", nextMonthStart)
    .order("fecha", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const caja = await getCajaById(supabase, config.caja_id);
  const fecha = buildEgresoDateForMonth(month, config.dia_pago);
  const fechaPagoResolved = options?.forcePagado ? options.fechaPago ?? fecha : null;
  const patch: Database["public"]["Tables"]["egresos"]["Insert"] = {
    concepto: config.concepto,
    categoria: config.categoria,
    monto: config.monto,
    fecha,
    recurrente: true,
    recurrente_config_id: config.id,
    caja_id: caja?.id ?? null,
    cuenta_medio: caja?.slug ?? null,
    pagado: options?.forcePagado ?? false,
    fecha_pago: fechaPagoResolved,
    cliente_id: config.cliente_id,
    proyecto_id: config.proyecto_id,
    notas: null
  };

  if (existing) {
    const updatePayload: Database["public"]["Tables"]["egresos"]["Update"] = {
      concepto: config.concepto,
      categoria: config.categoria,
      monto: config.monto,
      fecha,
      recurrente: true,
      recurrente_config_id: config.id,
      caja_id: caja?.id ?? null,
      cuenta_medio: caja?.slug ?? null,
      cliente_id: config.cliente_id,
      proyecto_id: config.proyecto_id
    };

    if (options?.forcePagado !== undefined) {
      updatePayload.pagado = options.forcePagado;
      updatePayload.fecha_pago = options.forcePagado ? fechaPagoResolved : null;
    }

    const { data, error } = await supabase.from("egresos").update(updatePayload).eq("id", existing.id).select("*").single();
    if (error || !data) {
      throw new Error(error?.message ?? "No se pudo actualizar la instancia recurrente.");
    }

    return { egreso: data as Egreso, created: false };
  }

  const { data, error } = await supabase.from("egresos").insert(patch).select("*").single();
  if (error || !data) {
    // A concurrent cron/page request can win the unique month insert. Return
    // that instance instead of surfacing a duplicate-generation error.
    if (error?.code === "23505") {
      const { data: concurrent } = await supabase
        .from("egresos")
        .select("*")
        .eq("recurrente_config_id", config.id)
        .gte("fecha", monthStart)
        .lt("fecha", nextMonthStart)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (concurrent) {
        return { egreso: concurrent as Egreso, created: false };
      }
    }

    throw new Error(error?.message ?? "No se pudo crear la instancia recurrente.");
  }

  return { egreso: data as Egreso, created: true };
}

export async function generarEgresosRecurrentesMes(
  supabase: FinanzasClient,
  month?: string | null
): Promise<GeneracionEgresosMesResult> {
  const targetMonth = getMonthKey(month);
  const nextMonthStart = hoyLocalString(addMonths(getMonthDate(targetMonth), 1));
  const { data: configs, error } = await supabase
    .from("egresos_recurrentes_config")
    .select("*")
    .eq("activo", true)
    .lt("fecha_inicio", nextMonthStart)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  let generados = 0;
  let existentes = 0;

  for (const config of (configs ?? []) as EgresoRecurrenteConfig[]) {
    const result = await ensureEgresoRecurrenteInstance(supabase, config, targetMonth);
    if (result.created) {
      generados += 1;
    } else {
      existentes += 1;
    }
  }

  return {
    month: targetMonth,
    configs: (configs ?? []).length,
    generados,
    existentes
  };
}

export async function syncRecurrenteConfigFromInstance(
  supabase: FinanzasClient,
  current: Egreso,
  input: UpdateEgresoInput | CreateEgresoInput
) {
  const willBeRecurrent = input.recurrente ?? current.recurrente;
  if (!willBeRecurrent) {
    return null;
  }

  const categoria = input.categoria ?? current.categoria;
  if (categoria === "transferencia") {
    throw new Error("La categoría transferencia no admite configuración recurrente.");
  }

  if (!current.recurrente_config_id) {
    return createRecurrenteConfig(supabase, {
      concepto: input.concepto ?? current.concepto,
      categoria,
      monto: input.monto ?? current.monto,
      fecha: input.fecha ?? current.fecha,
      cliente_id: input.cliente_id ?? current.cliente_id,
      proyecto_id: input.proyecto_id ?? current.proyecto_id,
      caja_id: input.caja_id ?? current.caja_id,
      cuenta_medio: input.cuenta_medio ?? current.cuenta_medio
    });
  }

  return updateRecurrenteConfig(supabase, current.recurrente_config_id, {
    concepto: input.concepto ?? current.concepto,
    categoria,
    monto: input.monto ?? current.monto,
    fecha: input.fecha ?? current.fecha,
    cliente_id: input.cliente_id ?? current.cliente_id,
    proyecto_id: input.proyecto_id ?? current.proyecto_id,
    caja_id: input.caja_id ?? current.caja_id,
    cuenta_medio: input.cuenta_medio ?? current.cuenta_medio
  });
}
