-- Relación comercial opcional para reuniones, sin alterar referencias históricas.
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS relacion_tipo text,
  ADD COLUMN IF NOT EXISTS relacion_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'eventos_relacion_tipo_check'
      AND conrelid = 'public.eventos'::regclass
  ) THEN
    ALTER TABLE public.eventos
      ADD CONSTRAINT eventos_relacion_tipo_check
      CHECK (relacion_tipo IS NULL OR relacion_tipo IN ('lead', 'cliente'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS eventos_relacion_idx
  ON public.eventos (relacion_tipo, relacion_id)
  WHERE relacion_id IS NOT NULL;
