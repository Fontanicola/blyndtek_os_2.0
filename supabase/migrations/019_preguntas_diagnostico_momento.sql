-- Separa las preguntas autoadministradas de las preguntas de la sesión comercial.
-- Idempotente: agrega la columna y su restricción sin tocar preguntas existentes.

alter table public.preguntas_diagnostico
  add column if not exists momento text;

alter table public.preguntas_diagnostico
  alter column momento set default 'formulario';

update public.preguntas_diagnostico
set momento = 'formulario'
where momento is null;

alter table public.preguntas_diagnostico
  alter column momento set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'preguntas_diagnostico_momento_check'
      and conrelid = 'public.preguntas_diagnostico'::regclass
  ) then
    alter table public.preguntas_diagnostico
      add constraint preguntas_diagnostico_momento_check
      check (momento in ('formulario', 'sesion'));
  end if;
end
$$;
