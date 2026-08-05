import { NextRequest, NextResponse } from "next/server";
import { getCalendlyInvitee } from "@/lib/calendly";
import { createAdminClient } from "@/lib/supabase/admin";
import { crearTareaConAdminClient } from "@/lib/tareas/crearTarea";

export const runtime = "nodejs";

type CalendlyWebhookBody = {
  event?: "invitee.created" | "invitee.canceled" | string;
  payload?: { event?: string; invitee?: string };
};

function extractEmail(notas: string | null) {
  const match = notas?.match(/(?:^|\n)Email:\s*([^\n]+)/i);
  return match?.[1]?.trim().toLowerCase() || null;
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.CALENDLY_WEBHOOK_SECRET?.trim();
  const receivedSecret = request.nextUrl.searchParams.get("secret")?.trim();

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Webhook no autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CalendlyWebhookBody;
    const eventType = body.event;
    const inviteeUri = body.payload?.invitee;

    if (!inviteeUri || (eventType !== "invitee.created" && eventType !== "invitee.canceled")) {
      return NextResponse.json({ received: true });
    }

    const invitee = await getCalendlyInvitee(inviteeUri);
    const resource = invitee.resource;
    const email = resource?.email?.trim().toLowerCase();

    if (!resource || !email) {
      return NextResponse.json({ received: true, matched: false });
    }

    const supabase = createAdminClient();
    const { data: leadRows, error: leadsError } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (leadsError) {
      throw new Error(leadsError.message);
    }

    const lead = (leadRows ?? []).find((row) => extractEmail(row.notas) === email);

    if (!lead) {
      return NextResponse.json({ received: true, matched: false });
    }

    const eventUri = resource.event ?? body.payload?.event ?? null;
    const location = resource.location;
    const enlaceReunion =
      typeof location === "string" ? location : location?.join_url ?? location?.url ?? null;
    const startTime = resource.start_time ?? null;
    const endTime = resource.end_time ?? null;
    const date = startTime?.slice(0, 10) ?? null;
    const titleBase = `Primera conversación · ${lead.empresa}`;
    const title = eventType === "invitee.canceled" ? `Cancelada · ${titleBase}` : titleBase;

    const { data: existingEvent, error: existingEventError } = await supabase
      .from("eventos")
      .select("*")
      .eq("calendly_invitee_uri", inviteeUri)
      .maybeSingle();

    if (existingEventError) {
      throw new Error(existingEventError.message);
    }

    const { data: admins } = await supabase
      .from("usuarios")
      .select("id")
      .eq("rol", "admin")
      .eq("activo", true)
      .order("created_at", { ascending: true })
      .limit(1);
    const ownerId = lead.vendedor_id ?? lead.responsable_id ?? admins?.[0]?.id;

    if (!ownerId || !startTime || !endTime || !date) {
      return NextResponse.json({ received: true, matched: true, event_created: false });
    }

    const eventPayload = {
      titulo: title,
      fecha_inicio: startTime,
      fecha_fin: endTime,
      tipo: "reunion" as const,
      usuario_id: ownerId,
      referencia_tipo: "lead" as const,
      referencia_id: lead.id,
      google_event_id: existingEvent?.google_event_id ?? null,
      calendly_event_id: eventUri,
      calendly_invitee_uri: inviteeUri,
      enlace_reunion: enlaceReunion
    };

    if (existingEvent) {
      await supabase.from("eventos").update(eventPayload).eq("id", existingEvent.id);
    } else {
      await supabase.from("eventos").insert(eventPayload);
    }

    await supabase
      .from("leads")
      .update({ llamada_fecha: eventType === "invitee.canceled" ? null : date, llamada_hecho: false })
      .eq("id", lead.id);

    if (eventType === "invitee.created") {
      const { data: existingTasks } = await supabase
        .from("tareas")
        .select("id")
        .eq("lead_id", lead.id)
        .ilike("titulo", "%Primera conversación%")
        .limit(1);

      if (!existingTasks?.length) {
        await crearTareaConAdminClient(supabase, {
          titulo: `Primera conversación · ${lead.empresa}`,
          lead_id: lead.id,
          responsable_id: ownerId,
          prioridad: "media",
          fecha_limite: date,
          estado: "nueva",
          notas: `Reserva recibida desde Calendly: ${inviteeUri}`
        });
      }
    }

    return NextResponse.json({ received: true, matched: true, event_created: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo procesar el webhook de Calendly.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
