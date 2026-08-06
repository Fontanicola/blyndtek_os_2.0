import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getCalendlyCurrentUser,
  getCalendlyEventInvitees,
  getCalendlyScheduledEvents
} from "@/lib/calendly";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function extractEmail(notas: string | null) {
  const match = notas?.match(/(?:^|\n)Email:\s*([^\n]+)/i);
  return match?.[1]?.trim().toLowerCase() || null;
}

function getLocationUrl(location: { join_url?: string; url?: string } | string | undefined) {
  return typeof location === "string" ? location : location?.join_url ?? location?.url ?? null;
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.rol !== "admin") {
    return NextResponse.json({ error: "Solo un administrador puede sincronizar Calendly." }, { status: 403 });
  }

  try {
    const calendlyUser = await getCalendlyCurrentUser();
    const userUri = calendlyUser.resource?.uri;
    if (!userUri) return NextResponse.json({ error: "Calendly no devolvió la URI del usuario." }, { status: 502 });

    const [scheduledEvents, supabase] = await Promise.all([
      getCalendlyScheduledEvents(userUri),
      Promise.resolve(createAdminClient())
    ]);
    const { data: leads, error: leadsError } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (leadsError) throw new Error(leadsError.message);

    const { data: admins } = await supabase
      .from("usuarios")
      .select("id")
      .eq("rol", "admin")
      .eq("activo", true)
      .order("created_at", { ascending: true })
      .limit(1);

    let synced = 0;
    for (const scheduledEvent of scheduledEvents.collection ?? []) {
      if (!scheduledEvent.uri || !scheduledEvent.start_time || !scheduledEvent.end_time) continue;
      const invitees = await getCalendlyEventInvitees(scheduledEvent.uri);

      for (const invitee of invitees.collection ?? []) {
        const email = invitee.email?.trim().toLowerCase();
        if (!invitee.uri || !email) continue;
        const lead = (leads ?? []).find((row) => extractEmail(row.notas) === email);
        if (!lead) continue;

        const ownerId = lead.vendedor_id ?? lead.responsable_id ?? admins?.[0]?.id;
        if (!ownerId) continue;
        const titleBase = `Primera conversación · ${lead.empresa}`;
        const { data: existing } = await supabase
          .from("eventos")
          .select("id")
          .eq("calendly_invitee_uri", invitee.uri)
          .maybeSingle();
        const payload = {
          titulo: titleBase,
          fecha_inicio: scheduledEvent.start_time,
          fecha_fin: scheduledEvent.end_time,
          tipo: "reunion" as const,
          usuario_id: ownerId,
          referencia_tipo: "lead" as const,
          referencia_id: lead.id,
          calendly_event_id: scheduledEvent.uri,
          calendly_invitee_uri: invitee.uri,
          enlace_reunion: getLocationUrl(scheduledEvent.location)
        };

        const result = existing
          ? await supabase.from("eventos").update(payload).eq("id", existing.id)
          : await supabase.from("eventos").insert(payload);
        if (result.error) throw new Error(result.error.message);

        await supabase.from("leads").update({ llamada_fecha: scheduledEvent.start_time.slice(0, 10), llamada_hecho: false }).eq("id", lead.id);
        synced += 1;
      }
    }

    return NextResponse.json({ data: { synced } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo sincronizar Calendly." }, { status: 500 });
  }
}
