-- Automatizaciones recurrentes y triggers de actualización
-- Esta migración no se ejecuta automáticamente desde Codex.
-- El usuario debe correrla manualmente en Supabase SQL Editor o via CLI.

-- ============================================================================
-- Trigger #5: recalcular avance_pct del proyecto cuando cambian las features
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalculate_project_progress()
RETURNS trigger AS $$
DECLARE
  target_proyecto_id uuid;
  total_features integer;
  completed_features integer;
  new_progress integer;
BEGIN
  target_proyecto_id := COALESCE(NEW.proyecto_id, OLD.proyecto_id);

  IF target_proyecto_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE estado = 'lista')::integer
  INTO total_features, completed_features
  FROM public.features
  WHERE proyecto_id = target_proyecto_id;

  new_progress := CASE
    WHEN total_features = 0 THEN 0
    ELSE ROUND((completed_features::numeric / total_features::numeric) * 100)::integer
  END;

  UPDATE public.proyectos
  SET avance_pct = new_progress
  WHERE id = target_proyecto_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS features_recalculate_project_progress ON public.features;
CREATE TRIGGER features_recalculate_project_progress
AFTER INSERT OR UPDATE OF estado OR DELETE ON public.features
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_project_progress();

-- ============================================================================
-- Trigger #6: fase completada en roadmap público
-- ============================================================================
-- No se crea un trigger adicional para este punto.
-- El roadmap público ya calcula el estado de cada fase en lectura, a partir
-- de las features y su estado. Mantenerlo como cálculo de consulta evita
-- duplicar estado derivado en la base de datos.

-- ============================================================================
-- Trigger #7: agendar el próximo recordatorio al marcar un toque de lead
-- ============================================================================

CREATE OR REPLACE FUNCTION public.schedule_next_lead_followup()
RETURNS trigger AS $$
DECLARE
  next_label text := null;
  next_date date := null;
  event_user uuid := null;
  event_title text := null;
  event_start timestamptz := null;
  event_end timestamptz := null;
BEGIN
  IF NEW.llamada_hecho IS TRUE AND COALESCE(OLD.llamada_hecho, FALSE) IS DISTINCT FROM TRUE THEN
    next_label := 'Seguimiento 1';
    next_date := NEW.seg1_fecha;
  ELSIF NEW.seg1_hecho IS TRUE AND COALESCE(OLD.seg1_hecho, FALSE) IS DISTINCT FROM TRUE THEN
    next_label := 'Seguimiento 2';
    next_date := NEW.seg2_fecha;
  ELSE
    next_label := null;
    next_date := null;
  END IF;

  IF next_label IS NULL OR next_date IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id
  INTO event_user
  FROM public.usuarios
  WHERE rol = 'admin'
    AND activo = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF event_user IS NULL THEN
    event_user := COALESCE(NEW.responsable_id, OLD.responsable_id);
  END IF;

  IF event_user IS NULL THEN
    RETURN NEW;
  END IF;

  event_title := NEW.empresa || ' · ' || next_label;
  event_start := next_date::timestamp + INTERVAL '10 hours';
  event_end := next_date::timestamp + INTERVAL '10 hours 30 minutes';

  IF EXISTS (
    SELECT 1
    FROM public.eventos
    WHERE referencia_tipo = 'lead'
      AND referencia_id = NEW.id
      AND titulo = event_title
      AND fecha_inicio::date = next_date
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.eventos (
    titulo,
    fecha_inicio,
    fecha_fin,
    tipo,
    usuario_id,
    referencia_tipo,
    referencia_id,
    google_event_id
  )
  VALUES (
    event_title,
    event_start,
    event_end,
    'seguimiento',
    event_user,
    'lead',
    NEW.id,
    NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS leads_schedule_next_followup ON public.leads;
CREATE TRIGGER leads_schedule_next_followup
AFTER UPDATE OF llamada_hecho, seg1_hecho, seg2_hecho ON public.leads
FOR EACH ROW
WHEN (
  (NEW.llamada_hecho IS TRUE AND COALESCE(OLD.llamada_hecho, FALSE) IS DISTINCT FROM TRUE)
  OR (NEW.seg1_hecho IS TRUE AND COALESCE(OLD.seg1_hecho, FALSE) IS DISTINCT FROM TRUE)
)
EXECUTE FUNCTION public.schedule_next_lead_followup();
