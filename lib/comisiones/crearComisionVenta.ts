import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularComision } from "@/lib/comisiones/calcular";
import type { Database } from "@/types/supabase";
import type { Comision, ConfigComisiones } from "@/types/comisiones";

type CrearComisionVentaInput = {
  vendedorId: string;
  clienteId: string;
  cotizacionId?: string | null;
  montoVenta: number;
};

type CrearComisionDiagnosticoInput = {
  vendedorId: string;
  leadId: string;
  montoDiagnostico: number;
};

async function getActiveConfig(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from("config_comisiones")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const config = (data?.[0] ?? null) as ConfigComisiones | null;

  if (!config) {
    throw new Error("No hay una configuración de comisiones activa.");
  }

  return config;
}

export async function crearComisionVenta(
  supabase: SupabaseClient<Database>,
  input: CrearComisionVentaInput
): Promise<Comision> {
  const config = await getActiveConfig(supabase);
  const { baseComision, porcentaje, montoComision } = calcularComision(input.montoVenta, config);

  const { data, error } = await supabase
    .from("comisiones")
    .insert({
      vendedor_id: input.vendedorId,
      cliente_id: input.clienteId,
      lead_id: null,
      cotizacion_id: input.cotizacionId ?? null,
      tipo: "venta",
      estado: "pendiente",
      monto_venta: input.montoVenta,
      base_comision: baseComision,
      porcentaje,
      monto_comision: montoComision,
      config_comisiones_id: config.id
    } as never)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear la comisión.");
  }

  return data as Comision;
}

export async function crearComisionDiagnostico(
  supabase: SupabaseClient<Database>,
  input: CrearComisionDiagnosticoInput
): Promise<Comision | null> {
  const config = await getActiveConfig(supabase);
  const montoComision = Number(config.comision_diagnostico_usd ?? 0);

  if (montoComision <= 0) {
    return null;
  }

  const { data, error } = await supabase
    .from("comisiones")
    .insert({
      vendedor_id: input.vendedorId,
      cliente_id: null,
      lead_id: input.leadId,
      cotizacion_id: null,
      tipo: "diagnostico",
      estado: "pendiente",
      monto_venta: input.montoDiagnostico,
      base_comision: input.montoDiagnostico,
      porcentaje: 0,
      monto_comision: montoComision,
      config_comisiones_id: config.id
    } as never)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear la comisión de diagnóstico.");
  }

  return data as Comision;
}
