-- Soporte operativo, revisiones trimestrales y oportunidades de expansión.
-- Idempotente para entornos que ya hayan aplicado parcialmente el modelo.

create table if not exists public.soporte_tickets (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  proyecto_id uuid references public.proyectos(id) on delete set null,
  titulo text not null,
  descripcion text not null,
  prioridad text not null default 'media' check (prioridad in ('baja', 'media', 'alta', 'critica')),
  sla_horas integer not null default 48,
  estado text not null default 'abierto' check (estado in ('abierto', 'en_progreso', 'esperando_cliente', 'resuelto', 'cerrado')),
  responsable_id uuid references public.usuarios(id) on delete set null,
  fecha_limite date,
  resuelto_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.soporte_handoffs (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null unique references public.proyectos(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'recibido', 'completo')),
  fecha_transferencia date,
  checklist jsonb not null default '{}'::jsonb,
  notas text,
  recibido_por uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.revisiones_cuenta (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  proyecto_id uuid references public.proyectos(id) on delete set null,
  periodo_inicio date not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'programada', 'realizada', 'cancelada')),
  fecha_programada date,
  fecha_realizada date,
  satisfaccion integer check (satisfaccion between 1 and 5),
  resumen text,
  decisiones text,
  proximas_acciones text[] not null default '{}',
  creado_por uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, periodo_inicio)
);

create table if not exists public.oportunidades_upsell (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  proyecto_id uuid references public.proyectos(id) on delete set null,
  titulo text not null,
  descripcion text,
  tipo text not null default 'modulo' check (tipo in ('nueva_fase', 'modulo', 'automatizacion', 'mantenimiento')),
  estado text not null default 'detectada' check (estado in ('detectada', 'contactada', 'propuesta', 'ganada', 'perdida')),
  prioridad text not null default 'media' check (prioridad in ('baja', 'media', 'alta')),
  monto_estimado_usd numeric,
  proxima_accion text,
  fecha_proxima_accion date,
  origen text not null default 'revision_trimestral' check (origen in ('revision_trimestral', 'soporte', 'delivery', 'comercial')),
  responsable_id uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists soporte_tickets_cliente_idx on public.soporte_tickets(cliente_id);
create index if not exists soporte_tickets_estado_idx on public.soporte_tickets(estado);
create index if not exists soporte_handoffs_cliente_idx on public.soporte_handoffs(cliente_id);
create index if not exists revisiones_cuenta_periodo_idx on public.revisiones_cuenta(periodo_inicio, estado);
create index if not exists oportunidades_upsell_estado_idx on public.oportunidades_upsell(estado);
