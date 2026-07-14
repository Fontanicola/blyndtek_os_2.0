-- Rol comercial, comisiones y compartición de carpetas
-- Ejecutar manualmente en Supabase SQL Editor o via CLI.

-- ============================================================================
-- Extensión de usuarios
-- ============================================================================

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('admin', 'miembro', 'comercial'));

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS supervisor_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- ============================================================================
-- Leads / clientes
-- ============================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS vendedor_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS vendedor_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leads_select_admin ON public.leads;
CREATE POLICY leads_select_admin
  ON public.leads FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS leads_select_comercial_own ON public.leads;
CREATE POLICY leads_select_comercial_own
  ON public.leads FOR SELECT TO authenticated
  USING (
    vendedor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'comercial'
    )
  );

DROP POLICY IF EXISTS leads_insert_admin ON public.leads;
CREATE POLICY leads_insert_admin
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS leads_insert_comercial_own ON public.leads;
CREATE POLICY leads_insert_comercial_own
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (
    vendedor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'comercial'
    )
  );

DROP POLICY IF EXISTS leads_update_admin ON public.leads;
CREATE POLICY leads_update_admin
  ON public.leads FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS leads_update_comercial_own ON public.leads;
CREATE POLICY leads_update_comercial_own
  ON public.leads FOR UPDATE TO authenticated
  USING (
    vendedor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'comercial'
    )
  )
  WITH CHECK (
    vendedor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'comercial'
    )
  );

DROP POLICY IF EXISTS clientes_select_admin ON public.clientes;
CREATE POLICY clientes_select_admin
  ON public.clientes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS clientes_select_comercial_own ON public.clientes;
CREATE POLICY clientes_select_comercial_own
  ON public.clientes FOR SELECT TO authenticated
  USING (
    vendedor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'comercial'
    )
  );

DROP POLICY IF EXISTS clientes_insert_admin ON public.clientes;
CREATE POLICY clientes_insert_admin
  ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS clientes_insert_comercial_own ON public.clientes;
CREATE POLICY clientes_insert_comercial_own
  ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (
    vendedor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'comercial'
    )
  );

DROP POLICY IF EXISTS clientes_update_admin ON public.clientes;
CREATE POLICY clientes_update_admin
  ON public.clientes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS clientes_update_comercial_own ON public.clientes;
CREATE POLICY clientes_update_comercial_own
  ON public.clientes FOR UPDATE TO authenticated
  USING (
    vendedor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'comercial'
    )
  )
  WITH CHECK (
    vendedor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'comercial'
    )
  );

-- ============================================================================
-- Comisiones
-- ============================================================================

ALTER TABLE public.comisiones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comisiones_select_admin ON public.comisiones;
CREATE POLICY comisiones_select_admin
  ON public.comisiones FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS comisiones_select_comercial_own ON public.comisiones;
CREATE POLICY comisiones_select_comercial_own
  ON public.comisiones FOR SELECT TO authenticated
  USING (
    vendedor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'comercial'
    )
  );

DROP POLICY IF EXISTS comisiones_insert_admin ON public.comisiones;
CREATE POLICY comisiones_insert_admin
  ON public.comisiones FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS comisiones_update_admin ON public.comisiones;
CREATE POLICY comisiones_update_admin
  ON public.comisiones FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

-- ============================================================================
-- Carpetas compartidas
-- ============================================================================

ALTER TABLE public.carpetas_compartidas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS carpetas_compartidas_select_admin ON public.carpetas_compartidas;
CREATE POLICY carpetas_compartidas_select_admin
  ON public.carpetas_compartidas FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS carpetas_compartidas_select_comercial_own ON public.carpetas_compartidas;
CREATE POLICY carpetas_compartidas_select_comercial_own
  ON public.carpetas_compartidas FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'comercial'
    )
  );

DROP POLICY IF EXISTS carpetas_compartidas_insert_admin ON public.carpetas_compartidas;
CREATE POLICY carpetas_compartidas_insert_admin
  ON public.carpetas_compartidas FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS carpetas_compartidas_delete_admin ON public.carpetas_compartidas;
CREATE POLICY carpetas_compartidas_delete_admin
  ON public.carpetas_compartidas FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'admin'
    )
  );
