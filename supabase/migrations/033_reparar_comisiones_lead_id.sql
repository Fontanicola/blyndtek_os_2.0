-- La eliminación completa de clientes y el listado de comisiones pueden
-- vincular una comisión con su lead de origen. En instalaciones antiguas
-- esta columna todavía no existe.

ALTER TABLE public.comisiones
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS comisiones_lead_id_idx
  ON public.comisiones (lead_id)
  WHERE lead_id IS NOT NULL;
