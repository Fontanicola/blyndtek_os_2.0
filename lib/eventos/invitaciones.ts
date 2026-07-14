import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type {
  Evento,
  EventoConInvitados,
  EventoInvitadoDetalle,
  EstadoEventoInvitado
} from "@/types/eventos";
import type { InvitacionPendienteEvento } from "@/types/eventosInvitados";
import type { Usuario } from "@/types/auth";

type EventoRow = {
  id: string;
  titulo: string;
  fecha_inicio: string;
  fecha_fin: string;
  usuario_id: string;
};

type EventoInvitadoRow = {
  id: string;
  evento_id: string;
  usuario_id: string;
  estado: EstadoEventoInvitado;
  fecha_propuesta_alt: string | null;
  hora_propuesta_alt: string | null;
  comentario: string | null;
  respondido_at: string | null;
  created_at: string;
};

type UsuarioRow = {
  id: string;
  nombre: string;
  email: string;
};

function uniqueIds(ids: string[]) {
  return [...new Set(ids.filter((value) => typeof value === "string" && value.trim().length > 0))];
}

export async function syncEventoInvitados(
  supabase: SupabaseClient<Database>,
  eventoId: string,
  invitedUserIds: string[],
  organizerId: string
) {
  const normalizedIds = uniqueIds(invitedUserIds).filter((id) => id !== organizerId);

  const { data: existing, error: existingError } = await supabase
    .from("eventos_invitados")
    .select("id, usuario_id")
    .eq("evento_id", eventoId);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const currentIds = new Set((existing ?? []).map((row) => row.usuario_id));
  const nextIds = new Set(normalizedIds);

  const idsToRemove = (existing ?? [])
    .filter((row) => !nextIds.has(row.usuario_id))
    .map((row) => row.id);

  if (idsToRemove.length > 0) {
    const { error: deleteError } = await supabase.from("eventos_invitados").delete().in("id", idsToRemove);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  const rowsToInsert = normalizedIds
    .filter((id) => !currentIds.has(id))
    .map((usuarioId) => ({
      evento_id: eventoId,
      usuario_id: usuarioId,
      estado: "pendiente" as const
    }));

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase.from("eventos_invitados").insert(rowsToInsert);

    if (insertError) {
      throw new Error(insertError.message);
    }
  }
}

export async function fetchEventoInvitadosDetalle(
  supabase: SupabaseClient<Database>,
  eventoId: string
): Promise<EventoInvitadoDetalle[]> {
  const { data: invitaciones, error } = await supabase
    .from("eventos_invitados")
    .select("*")
    .eq("evento_id", eventoId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const invitacionRows = (invitaciones ?? []) as EventoInvitadoRow[];
  const usuarioIds = uniqueIds(invitacionRows.map((row) => row.usuario_id));

  if (usuarioIds.length === 0) {
    return [];
  }

  const { data: usuarios, error: usuariosError } = await supabase
    .from("usuarios")
    .select("id, nombre, email")
    .in("id", usuarioIds);

  if (usuariosError) {
    throw new Error(usuariosError.message);
  }

  const usuariosById = new Map((usuarios ?? []).map((usuario) => [usuario.id, usuario as UsuarioRow]));

  return invitacionRows.map((row) => {
    const usuario = usuariosById.get(row.usuario_id);
    return {
      ...row,
      usuario_nombre: usuario?.nombre ?? "Usuario",
      usuario_email: usuario?.email ?? null
    };
  });
}

export async function fetchEventoConInvitados(
  supabase: SupabaseClient<Database>,
  eventoId: string
): Promise<EventoConInvitados | null> {
  const { data: evento, error } = await supabase.from("eventos").select("*").eq("id", eventoId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!evento) {
    return null;
  }

  const invitaciones = await fetchEventoInvitadosDetalle(supabase, eventoId);

  return {
    ...(evento as Evento),
    invited_user_ids: invitaciones.map((invitacion) => invitacion.usuario_id),
    invitaciones
  };
}

export async function fetchInvitacionesPendientesUsuario(
  supabase: SupabaseClient<Database>,
  usuarioId: string
): Promise<InvitacionPendienteEvento[]> {
  const { data: invitaciones, error } = await supabase
    .from("eventos_invitados")
    .select("*")
    .eq("usuario_id", usuarioId)
    .eq("estado", "pendiente")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const invitacionRows = (invitaciones ?? []) as EventoInvitadoRow[];
  const eventoIds = uniqueIds(invitacionRows.map((row) => row.evento_id));
  const invitadoIds = uniqueIds(invitacionRows.map((row) => row.usuario_id));

  if (eventoIds.length === 0) {
    return [];
  }

  const { data: eventos, error: eventosError } = await supabase
    .from("eventos")
    .select("id, titulo, fecha_inicio, fecha_fin, usuario_id")
    .in("id", eventoIds);

  if (eventosError) {
    throw new Error(eventosError.message);
  }

  const organizadorIds = uniqueIds((eventos ?? []).map((evento) => (evento as EventoRow).usuario_id));

  const { data: usuarios, error: usuariosError } = await supabase
    .from("usuarios")
    .select("id, nombre")
    .in("id", [...organizadorIds, ...invitadoIds]);

  if (usuariosError) {
    throw new Error(usuariosError.message);
  }

  const eventosById = new Map((eventos ?? []).map((evento) => [evento.id, evento as EventoRow]));
  const usuariosById = new Map((usuarios ?? []).map((usuario) => [usuario.id, usuario as Pick<UsuarioRow, "id" | "nombre">]));

  return invitacionRows.flatMap((row) => {
    const evento = eventosById.get(row.evento_id);
    if (!evento) {
      return [];
    }

    const organizador = usuariosById.get(evento.usuario_id);
    return [
      {
        ...row,
        usuario_nombre: usuariosById.get(row.usuario_id)?.nombre ?? "Usuario",
        evento_titulo: evento.titulo,
        evento_fecha_inicio: evento.fecha_inicio,
        evento_fecha_fin: evento.fecha_fin,
        organizador_id: evento.usuario_id,
        organizador_nombre: organizador?.nombre ?? "Organizador"
      }
    ];
  });
}

export async function fetchEventoIdsAceptadosUsuario(
  supabase: SupabaseClient<Database>,
  usuarioId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("eventos_invitados")
    .select("evento_id")
    .eq("usuario_id", usuarioId)
    .eq("estado", "aceptado");

  if (error) {
    throw new Error(error.message);
  }

  return uniqueIds((data ?? []).map((row) => row.evento_id));
}

export async function usuarioPuedeVerEvento(
  supabase: SupabaseClient<Database>,
  evento: { id: string; usuario_id: string },
  usuario: Usuario
): Promise<boolean> {
  if (usuario.rol === "admin") {
    return true;
  }

  if (evento.usuario_id === usuario.id) {
    return true;
  }

  const { data, error } = await supabase
    .from("eventos_invitados")
    .select("id")
    .eq("evento_id", evento.id)
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}
