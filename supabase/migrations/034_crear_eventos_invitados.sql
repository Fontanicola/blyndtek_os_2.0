-- Tabla de invitaciones a reuniones/eventos para instalaciones donde la
-- migración original todavía no fue aplicada.

CREATE TABLE IF NOT EXISTS public.eventos_invitados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aceptado', 'rechazado', 'propuesta_alternativa')),
  fecha_propuesta_alt date NULL,
  hora_propuesta_alt time NULL,
  comentario text NULL,
  respondido_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evento_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS eventos_invitados_evento_id_idx ON public.eventos_invitados (evento_id);
CREATE INDEX IF NOT EXISTS eventos_invitados_usuario_id_idx ON public.eventos_invitados (usuario_id);
CREATE INDEX IF NOT EXISTS eventos_invitados_estado_idx ON public.eventos_invitados (estado);

ALTER TABLE public.eventos_invitados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eventos_invitados_select_own_or_owner ON public.eventos_invitados;
CREATE POLICY eventos_invitados_select_own_or_owner
  ON public.eventos_invitados FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.eventos e WHERE e.id = evento_id AND e.usuario_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin')
  );

DROP POLICY IF EXISTS eventos_invitados_update_own_or_owner ON public.eventos_invitados;
CREATE POLICY eventos_invitados_update_own_or_owner
  ON public.eventos_invitados FOR UPDATE TO authenticated
  USING (
    usuario_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.eventos e WHERE e.id = evento_id AND e.usuario_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin')
  )
  WITH CHECK (
    usuario_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.eventos e WHERE e.id = evento_id AND e.usuario_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin')
  );

DROP POLICY IF EXISTS eventos_invitados_insert_owner ON public.eventos_invitados;
CREATE POLICY eventos_invitados_insert_owner
  ON public.eventos_invitados FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.eventos e WHERE e.id = evento_id AND e.usuario_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin')
  );

DROP POLICY IF EXISTS eventos_invitados_delete_owner ON public.eventos_invitados;
CREATE POLICY eventos_invitados_delete_owner
  ON public.eventos_invitados FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.eventos e WHERE e.id = evento_id AND e.usuario_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol = 'admin')
  );
