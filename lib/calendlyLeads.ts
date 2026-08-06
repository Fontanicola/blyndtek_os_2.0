import type { Lead } from "@/types/leads";
import type { createAdminClient } from "@/lib/supabase/admin";

type CalendlyLeadInput = {
  email: string;
  name?: string | null;
  eventName?: string | null;
  ownerId?: string | null;
};

function extractEmail(notas: string | null) {
  const match = notas?.match(/(?:^|\n)Email:\s*([^\n]+)/i);
  return match?.[1]?.trim().toLowerCase() || null;
}

export async function findOrCreateCalendlyLead(
  supabase: ReturnType<typeof createAdminClient>,
  leads: Lead[],
  input: CalendlyLeadInput
) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = leads.find((lead) => extractEmail(lead.notas) === normalizedEmail);
  if (existing) return { lead: existing, created: false };

  const displayName = input.name?.trim() || normalizedEmail.split("@")[0] || "Contacto Calendly";
  const company = `Reserva Calendly · ${displayName}`;
  const notes = [
    `Email: ${normalizedEmail}`,
    "Origen: Calendly",
    input.eventName ? `Evento: ${input.eventName}` : null
  ].filter(Boolean).join("\n");

  const { data, error } = await supabase
    .from("leads")
    .insert({
      canal: "inbound",
      canal_origen: "organico",
      empresa: company,
      etapa: "por_contactar",
      contacto_1_nombre: displayName,
      notas: notes,
      vendedor_id: input.ownerId ?? null,
      responsable_id: input.ownerId ?? null
    })
    .select("*")
    .single();

  if (error) throw new Error(`No se pudo crear el lead de Calendly: ${error.message}`);
  const lead = data as Lead;
  leads.unshift(lead);
  return { lead, created: true };
}
