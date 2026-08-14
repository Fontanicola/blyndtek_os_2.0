-- Eliminación física y atómica de toda la información vinculada a un cliente.
-- La API valida que la operación sólo pueda ser iniciada por un administrador.
CREATE OR REPLACE FUNCTION public.eliminar_cliente_completo(target_cliente_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_ids uuid[] := ARRAY[]::uuid[];
  phase_ids uuid[] := ARRAY[]::uuid[];
  feature_ids uuid[] := ARRAY[]::uuid[];
  folder_ids uuid[] := ARRAY[]::uuid[];
  note_ids uuid[] := ARRAY[]::uuid[];
  quote_ids uuid[] := ARRAY[]::uuid[];
  contract_ids uuid[] := ARRAY[]::uuid[];
  subscription_ids uuid[] := ARRAY[]::uuid[];
  commission_ids uuid[] := ARRAY[]::uuid[];
  cobro_ids uuid[] := ARRAY[]::uuid[];
  egreso_ids uuid[] := ARRAY[]::uuid[];
  event_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF target_cliente_id IS NULL THEN
    RAISE EXCEPTION 'El cliente es obligatorio.' USING ERRCODE = '22004';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO project_ids
    FROM public.proyectos
   WHERE cliente_id = target_cliente_id;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO phase_ids
    FROM public.fases_proyecto
   WHERE proyecto_id = ANY(project_ids);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO feature_ids
    FROM public.features
   WHERE proyecto_id = ANY(project_ids);

  WITH RECURSIVE folder_tree AS (
    SELECT id
      FROM public.carpetas
     WHERE cliente_id = target_cliente_id
        OR proyecto_id = ANY(project_ids)
    UNION
    SELECT child.id
      FROM public.carpetas child
      JOIN folder_tree parent ON child.carpeta_padre_id = parent.id
  )
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO folder_ids
    FROM folder_tree;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO note_ids
    FROM public.notas
   WHERE cliente_id = target_cliente_id
      OR proyecto_id = ANY(project_ids);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO quote_ids
    FROM public.cotizaciones
   WHERE cliente_id = target_cliente_id;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO contract_ids
    FROM public.contratos
   WHERE cliente_id = target_cliente_id;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO subscription_ids
    FROM public.suscripciones
   WHERE cliente_id = target_cliente_id
      OR proyecto_id = ANY(project_ids);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO commission_ids
    FROM public.comisiones
   WHERE cliente_id = target_cliente_id
      OR proyecto_id = ANY(project_ids);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO cobro_ids
    FROM public.cobros
   WHERE cliente_id = target_cliente_id
      OR proyecto_id = ANY(project_ids)
      OR contrato_id = ANY(contract_ids)
      OR suscripcion_id = ANY(subscription_ids)
      OR cotizacion_id = ANY(quote_ids);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO egreso_ids
    FROM public.egresos
   WHERE cliente_id = target_cliente_id
      OR proyecto_id = ANY(project_ids)
      OR comision_id = ANY(commission_ids);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO event_ids
    FROM public.eventos
   WHERE relacion_tipo = 'cliente'
     AND relacion_id = target_cliente_id;

  -- Primero se limpian tablas dependientes sin ON DELETE CASCADE.
  DELETE FROM public.eventos_invitados WHERE evento_id = ANY(event_ids);
  DELETE FROM public.eventos WHERE id = ANY(event_ids);

  DELETE FROM public.notas_compartidas WHERE nota_id = ANY(note_ids);
  DELETE FROM public.notas WHERE id = ANY(note_ids);

  DELETE FROM public.archivos WHERE carpeta_id = ANY(folder_ids);
  DELETE FROM public.carpetas_compartidas WHERE carpeta_id = ANY(folder_ids);
  UPDATE public.carpetas SET carpeta_padre_id = NULL WHERE id = ANY(folder_ids);
  DELETE FROM public.carpetas WHERE id = ANY(folder_ids);

  DELETE FROM public.transferencias_caja
   WHERE cobro_id = ANY(cobro_ids)
      OR egreso_id = ANY(egreso_ids);
  DELETE FROM public.cobros_historial_cambios WHERE cobro_id = ANY(cobro_ids);

  DELETE FROM public.ai_dev_ejecuciones WHERE fase_id = ANY(phase_ids);
  DELETE FROM public.checklist_qa WHERE fase_id = ANY(phase_ids);
  DELETE FROM public.sesiones_tiempo WHERE fase_id = ANY(phase_ids);
  DELETE FROM public.tareas WHERE proyecto_id = ANY(project_ids) OR feature_id = ANY(feature_ids);
  DELETE FROM public.features WHERE id = ANY(feature_ids);
  DELETE FROM public.fases_proyecto WHERE id = ANY(phase_ids);
  DELETE FROM public.cuentas_servicios WHERE proyecto_id = ANY(project_ids);

  DELETE FROM public.soporte_tickets WHERE cliente_id = target_cliente_id;
  DELETE FROM public.soporte_handoffs WHERE cliente_id = target_cliente_id;
  DELETE FROM public.revisiones_cuenta WHERE cliente_id = target_cliente_id;
  DELETE FROM public.oportunidades_upsell WHERE cliente_id = target_cliente_id;

  DELETE FROM public.producto_features WHERE solicitado_por_cliente_id = target_cliente_id;
  DELETE FROM public.sistemas_gestionados
   WHERE cliente_id = target_cliente_id
      OR proyecto_id = ANY(project_ids);
  DELETE FROM public.egresos WHERE id = ANY(egreso_ids);
  DELETE FROM public.cobros WHERE id = ANY(cobro_ids);
  DELETE FROM public.comisiones WHERE id = ANY(commission_ids);
  DELETE FROM public.suscripciones WHERE id = ANY(subscription_ids);
  DELETE FROM public.contratos WHERE id = ANY(contract_ids);
  DELETE FROM public.egresos_recurrentes_config
   WHERE cliente_id = target_cliente_id
      OR proyecto_id = ANY(project_ids);
  DELETE FROM public.proyectos WHERE id = ANY(project_ids);
  DELETE FROM public.cotizaciones WHERE id = ANY(quote_ids);
  DELETE FROM public.clientes WHERE id = target_cliente_id;
END;
$$;

REVOKE ALL ON FUNCTION public.eliminar_cliente_completo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eliminar_cliente_completo(uuid) TO service_role;
