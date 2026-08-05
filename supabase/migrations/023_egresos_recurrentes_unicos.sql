-- Evita que dos crons o dos pestañas creen más de una instancia mensual
-- para la misma plantilla recurrente. Las instancias históricas existentes
-- se conservan y la migración es segura porque el diagnóstico actual no
-- encontró grupos duplicados.
create unique index if not exists egresos_recurrente_config_mes_unique
  on public.egresos (recurrente_config_id, date_trunc('month', fecha))
  where recurrente_config_id is not null;
