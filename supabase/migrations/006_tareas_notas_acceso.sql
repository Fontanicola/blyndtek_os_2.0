-- Tareas y notas: visibilidad por usuario + compartición puntual
-- Ejecutar manualmente en Supabase SQL Editor o via CLI.

-- ============================================================================
-- Tareas
-- ============================================================================

ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tareas_select_admin ON public.tareas;
CREATE POLICY tareas_select_admin
  ON public.tareas FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS tareas_select_own ON public.tareas;
CREATE POLICY tareas_select_own
  ON public.tareas FOR SELECT TO authenticated
  USING (
    responsable_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol IN ('miembro', 'comercial')
    )
  );

DROP POLICY IF EXISTS tareas_insert_admin ON public.tareas;
CREATE POLICY tareas_insert_admin
  ON public.tareas FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS tareas_insert_own ON public.tareas;
CREATE POLICY tareas_insert_own
  ON public.tareas FOR INSERT TO authenticated
  WITH CHECK (
    responsable_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol IN ('miembro', 'comercial')
    )
  );

DROP POLICY IF EXISTS tareas_update_admin ON public.tareas;
CREATE POLICY tareas_update_admin
  ON public.tareas FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS tareas_update_own ON public.tareas;
CREATE POLICY tareas_update_own
  ON public.tareas FOR UPDATE TO authenticated
  USING (
    responsable_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol IN ('miembro', 'comercial')
    )
  )
  WITH CHECK (
    responsable_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol IN ('miembro', 'comercial')
    )
  );

DROP POLICY IF EXISTS tareas_delete_admin ON public.tareas;
CREATE POLICY tareas_delete_admin
  ON public.tareas FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS tareas_delete_own ON public.tareas;
CREATE POLICY tareas_delete_own
  ON public.tareas FOR DELETE TO authenticated
  USING (
    responsable_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol IN ('miembro', 'comercial')
    )
  );

-- ============================================================================
-- Notas
-- ============================================================================

ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_compartidas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notas_select_admin ON public.notas;
CREATE POLICY notas_select_admin
  ON public.notas FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS notas_select_miembro ON public.notas;
CREATE POLICY notas_select_miembro
  ON public.notas FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'miembro'
    )
  );

DROP POLICY IF EXISTS notas_select_comercial_own_or_shared ON public.notas;
CREATE POLICY notas_select_comercial_own_or_shared
  ON public.notas FOR SELECT TO authenticated
  USING (
    (
      creado_por = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.notas_compartidas nc
        WHERE nc.nota_id = id
          AND nc.usuario_id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'comercial'
    )
  );

DROP POLICY IF EXISTS notas_insert_admin ON public.notas;
CREATE POLICY notas_insert_admin
  ON public.notas FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS notas_insert_miembro ON public.notas;
CREATE POLICY notas_insert_miembro
  ON public.notas FOR INSERT TO authenticated
  WITH CHECK (
    creado_por = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'miembro'
    )
  );

DROP POLICY IF EXISTS notas_insert_comercial ON public.notas;
CREATE POLICY notas_insert_comercial
  ON public.notas FOR INSERT TO authenticated
  WITH CHECK (
    creado_por = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'comercial'
    )
  );

DROP POLICY IF EXISTS notas_update_admin ON public.notas;
CREATE POLICY notas_update_admin
  ON public.notas FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS notas_update_miembro ON public.notas;
CREATE POLICY notas_update_miembro
  ON public.notas FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'miembro'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'miembro'
    )
  );

DROP POLICY IF EXISTS notas_update_comercial_own_or_shared ON public.notas;
CREATE POLICY notas_update_comercial_own_or_shared
  ON public.notas FOR UPDATE TO authenticated
  USING (
    (
      creado_por = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.notas_compartidas nc
        WHERE nc.nota_id = id
          AND nc.usuario_id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'comercial'
    )
  )
  WITH CHECK (
    (
      creado_por = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.notas_compartidas nc
        WHERE nc.nota_id = id
          AND nc.usuario_id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'comercial'
    )
  );

DROP POLICY IF EXISTS notas_delete_admin ON public.notas;
CREATE POLICY notas_delete_admin
  ON public.notas FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS notas_delete_miembro ON public.notas;
CREATE POLICY notas_delete_miembro
  ON public.notas FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'miembro'
    )
  );

DROP POLICY IF EXISTS notas_delete_comercial_own_or_shared ON public.notas;
CREATE POLICY notas_delete_comercial_own_or_shared
  ON public.notas FOR DELETE TO authenticated
  USING (
    (
      creado_por = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.notas_compartidas nc
        WHERE nc.nota_id = id
          AND nc.usuario_id = auth.uid()
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'comercial'
    )
  );

DROP POLICY IF EXISTS notas_compartidas_select_admin ON public.notas_compartidas;
CREATE POLICY notas_compartidas_select_admin
  ON public.notas_compartidas FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS notas_compartidas_select_comercial_own ON public.notas_compartidas;
CREATE POLICY notas_compartidas_select_comercial_own
  ON public.notas_compartidas FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'comercial'
    )
  );

DROP POLICY IF EXISTS notas_compartidas_insert_admin ON public.notas_compartidas;
CREATE POLICY notas_compartidas_insert_admin
  ON public.notas_compartidas FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS notas_compartidas_delete_admin ON public.notas_compartidas;
CREATE POLICY notas_compartidas_delete_admin
  ON public.notas_compartidas FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );
