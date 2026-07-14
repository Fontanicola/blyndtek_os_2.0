import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { Cliente } from "@/types/clientes";
import type { Lead } from "@/types/leads";

type EnsureClienteDesdeLeadInput = {
  lead: Pick<
    Lead,
    "id" | "empresa" | "contacto_1_nombre" | "contacto_1_tel" | "vendedor_id"
  >;
  vendedorIdFallback?: string | null;
};

export async function ensureClienteDesdeLead(
  supabase: SupabaseClient<Database>,
  input: EnsureClienteDesdeLeadInput
): Promise<{ cliente: Cliente; created: boolean }> {
  const { lead } = input;

  const { data: existingCliente, error: existingError } = await supabase
    .from("clientes")
    .select("*")
    .eq("lead_id", lead.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingCliente) {
    const nextVendedorId = existingCliente.vendedor_id ?? lead.vendedor_id ?? input.vendedorIdFallback ?? null;

    if (nextVendedorId !== existingCliente.vendedor_id) {
      const { data: updatedCliente, error: updateError } = await supabase
        .from("clientes")
        .update({ vendedor_id: nextVendedorId })
        .eq("id", existingCliente.id)
        .select("*")
        .single();

      if (updateError || !updatedCliente) {
        throw new Error(updateError?.message ?? "No se pudo actualizar el cliente existente.");
      }

      return { cliente: updatedCliente as Cliente, created: false };
    }

    return { cliente: existingCliente as Cliente, created: false };
  }

  const vendedorId = lead.vendedor_id ?? input.vendedorIdFallback ?? null;

  const { data, error } = await supabase
    .from("clientes")
    .insert({
      lead_id: lead.id,
      empresa: lead.empresa,
      pais: null,
      contacto_nombre: lead.contacto_1_nombre ?? null,
      contacto_email: null,
      contacto_whatsapp: lead.contacto_1_tel ?? null,
      datos_facturacion: null,
      estado: "activo",
      notas: null,
      vendedor_id: vendedorId
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear el cliente.");
  }

  return { cliente: data as Cliente, created: true };
}
