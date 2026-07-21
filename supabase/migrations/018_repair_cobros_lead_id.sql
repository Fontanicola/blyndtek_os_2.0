alter table public.cobros
  alter column cliente_id drop not null;

alter table public.cobros
  add column if not exists lead_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cobros_lead_id_fkey'
      and conrelid = 'public.cobros'::regclass
  ) then
    alter table public.cobros
      add constraint cobros_lead_id_fkey
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
