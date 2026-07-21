alter table public.cobros
  alter column cliente_id drop not null;

alter table public.cobros
  add column if not exists lead_id uuid references public.leads(id) on delete set null;

alter table public.contratos
  add column if not exists descuento_diagnostico_usd numeric not null default 0;

alter table public.comisiones
  alter column cliente_id drop not null;

alter table public.comisiones
  add column if not exists lead_id uuid references public.leads(id) on delete set null;

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
    check (tipo in ('one_pay', 'hito', 'mantenimiento', 'brick', 'diagnostico'));
end $$;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.comisiones'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%tipo%'
  loop
    execute format('alter table public.comisiones drop constraint %I', constraint_record.conname);
  end loop;

  alter table public.comisiones
    add constraint comisiones_tipo_check
    check (tipo in ('venta', 'diagnostico'));
end $$;
