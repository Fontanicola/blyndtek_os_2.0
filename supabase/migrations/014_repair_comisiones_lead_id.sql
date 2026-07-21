alter table public.comisiones
  alter column cliente_id drop not null;

alter table public.comisiones
  add column if not exists lead_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comisiones_lead_id_fkey'
      and conrelid = 'public.comisiones'::regclass
  ) then
    alter table public.comisiones
      add constraint comisiones_lead_id_fkey
      foreign key (lead_id)
      references public.leads(id)
      on delete set null;
  end if;
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
