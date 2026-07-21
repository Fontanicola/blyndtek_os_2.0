alter table public.contratos
  add column if not exists descuento_diagnostico_usd numeric not null default 0;
