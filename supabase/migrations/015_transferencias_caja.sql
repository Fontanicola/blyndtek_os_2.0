alter table public.egresos
  add column if not exists caja_id uuid references public.cajas(id);

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.cobros'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%tipo%'
  loop
    execute format('alter table public.cobros drop constraint %I', constraint_record.conname);
  end loop;

  alter table public.cobros
    add constraint cobros_tipo_check
    check (tipo in ('one_pay', 'hito', 'mantenimiento', 'brick', 'diagnostico', 'otro', 'transferencia'));
end $$;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.egresos'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%categoria%'
  loop
    execute format('alter table public.egresos drop constraint %I', constraint_record.conname);
  end loop;

  alter table public.egresos
    add constraint egresos_categoria_check
    check (
      categoria in (
        'dominios',
        'hosting_infraestructura',
        'herramientas_software',
        'marketing_ads',
        'impuestos_contable',
        'sueldos_honorarios',
        'comisiones',
        'otro',
        'transferencia'
      )
    );
end $$;

create table if not exists public.transferencias_caja (
  id uuid primary key default gen_random_uuid(),
  caja_origen_id uuid not null references public.cajas(id),
  caja_destino_id uuid not null references public.cajas(id),
  monto numeric not null,
  fecha date not null,
  nota text null,
  egreso_id uuid not null references public.egresos(id),
  cobro_id uuid not null references public.cobros(id),
  creado_por uuid null references public.usuarios(id),
  created_at timestamptz not null default now()
);
