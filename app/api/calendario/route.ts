import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  endOfMonth,
  startOfMonth,
  startOfDay,
  endOfDay,
  sortCalendarItems
} from "@/lib/calendario";
import type { CalendarItem } from "@/types/calendario";
import type { Evento } from "@/types/eventos";
import type { Lead } from "@/types/leads";
import type { Tarea } from "@/types/tareas";

type CalendarResponse = {
  data: CalendarItem[];
};

function parseDateParam(value: string | null, fallback: Date) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed;
}

function toIsoStart(date: Date) {
  return startOfDay(date).toISOString();
}

function toIsoEnd(date: Date) {
  return endOfDay(date).toISOString();
}

function toDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildTaskItem(tarea: Tarea): CalendarItem {
  const date = new Date(`${tarea.fecha_limite ?? new Date().toISOString().slice(0, 10)}T09:00:00`);
  return {
    id: `tarea:${tarea.id}`,
    titulo: tarea.titulo,
    start: date.toISOString(),
    end: new Date(date.getTime() + 30 * 60 * 1000).toISOString(),
    tipo: "tarea",
    source: "tarea",
    referenceId: tarea.id,
    usuarioId: tarea.responsable_id,
    details: tarea.proyecto_id ? `Tarea vinculada a proyecto` : "Tarea sin proyecto"
  };
}

function buildLeadReminderItems(lead: Lead, rangeStart: Date, rangeEnd: Date): CalendarItem[] {
  const items: CalendarItem[] = [];

  const touchMap: Array<{
    date: string | null;
    done: boolean;
    label: string;
    hour: number;
  }> = [
    { date: lead.llamada_fecha, done: lead.llamada_hecho, label: "Llamada", hour: 10 },
    { date: lead.seg1_fecha, done: lead.seg1_hecho, label: "Seguimiento 1", hour: 12 },
    { date: lead.seg2_fecha, done: lead.seg2_hecho, label: "Seguimiento 2", hour: 14 }
  ];

  for (const touch of touchMap) {
    if (!touch.date || touch.done) {
      continue;
    }

    const date = new Date(`${touch.date}T${touch.hour.toString().padStart(2, "0")}:00:00`);

    if (date.getTime() >= rangeStart.getTime() && date.getTime() <= rangeEnd.getTime()) {
      items.push({
        id: `lead:${lead.id}:${touch.label.toLowerCase().replace(/\s+/g, "-")}`,
        titulo: `${lead.empresa} · ${touch.label}`,
        start: date.toISOString(),
        end: new Date(date.getTime() + 30 * 60 * 1000).toISOString(),
        tipo: "seguimiento",
        source: "lead",
        referenceId: lead.id,
        usuarioId: lead.responsable_id,
        details: "Recordatorio de seguimiento"
      });
    }
  }

  return items;
}

function buildLeadReminderKeys(eventos: Evento[]) {
  const keys = new Set<string>();

  for (const evento of eventos) {
    if (evento.referencia_tipo !== "lead") {
      continue;
    }

    const label =
      evento.titulo.includes("Seguimiento 1")
        ? "Seguimiento 1"
        : evento.titulo.includes("Seguimiento 2")
          ? "Seguimiento 2"
          : evento.titulo.includes("Llamada")
            ? "Llamada"
            : null;

    if (!label) {
      continue;
    }

    keys.add(`${evento.referencia_id}:${label}:${evento.fecha_inicio.slice(0, 10)}`);
  }

  return keys;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const today = new Date();
    const rangeStart = parseDateParam(searchParams.get("desde"), startOfMonth(today));
    const rangeEnd = parseDateParam(searchParams.get("hasta"), endOfMonth(today));

    const [eventosResult, tareasResult, leadsResult] = await Promise.all([
      supabase
        .from("eventos")
        .select("*")
        .lte("fecha_inicio", toIsoEnd(rangeEnd))
        .gte("fecha_fin", toIsoStart(rangeStart))
        .order("fecha_inicio", { ascending: true }),
      supabase
        .from("tareas")
        .select("*")
        .not("fecha_limite", "is", null)
        .gte("fecha_limite", toDateOnly(rangeStart))
        .lte("fecha_limite", toDateOnly(rangeEnd))
        .order("fecha_limite", { ascending: true, nullsFirst: false }),
      supabase
        .from("leads")
        .select(
          "id, empresa, responsable_id, llamada_fecha, llamada_hecho, seg1_fecha, seg1_hecho, seg2_fecha, seg2_hecho"
        )
        .in("etapa", ["por_contactar", "contactado", "seguimiento", "calificado", "cotizacion"])
        .order("updated_at", { ascending: false })
    ]);

    if (eventosResult.error) {
      return NextResponse.json({ error: eventosResult.error.message }, { status: 500 });
    }

    if (tareasResult.error) {
      return NextResponse.json({ error: tareasResult.error.message }, { status: 500 });
    }

    if (leadsResult.error) {
      return NextResponse.json({ error: leadsResult.error.message }, { status: 500 });
    }

    const eventos = (eventosResult.data ?? []).map((evento): CalendarItem => {
      const typedEvento = evento as Evento;
      return {
        id: typedEvento.id,
        titulo: typedEvento.titulo,
        start: typedEvento.fecha_inicio,
        end: typedEvento.fecha_fin,
        tipo: typedEvento.tipo,
        source: "evento",
        referenceId: typedEvento.id,
        usuarioId: typedEvento.usuario_id,
        details: typedEvento.referencia_tipo
      };
    });

    const tareas = (tareasResult.data ?? []).map((tarea) => buildTaskItem(tarea as Tarea));
    const leadReminderKeys = buildLeadReminderKeys((eventosResult.data ?? []) as Evento[]);
    const leadItems = (leadsResult.data ?? []).flatMap((lead) => {
      const typedLead = lead as Lead;
      return buildLeadReminderItems(typedLead, rangeStart, rangeEnd).filter((item) => {
        const key = `${typedLead.id}:${item.titulo.includes("Seguimiento 1") ? "Seguimiento 1" : item.titulo.includes("Seguimiento 2") ? "Seguimiento 2" : "Llamada"}:${item.start.slice(0, 10)}`;
        return !leadReminderKeys.has(key);
      });
    });

    return NextResponse.json({
      data: sortCalendarItems([...eventos, ...tareas, ...leadItems])
    } satisfies CalendarResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
