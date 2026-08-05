-- Content Operations: canales, identidad editable y trazabilidad de publicación.
-- Se mantienen las piezas_contenido existentes como unidad de contenido y calendario.

create table if not exists public.marca_identidad_secciones (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas_contenido(id) on delete cascade,
  clave text not null,
  titulo text not null,
  contenido text not null default '',
  orden integer not null default 0,
  visible boolean not null default true,
  updated_by uuid null references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (marca_id, clave)
);

create table if not exists public.contenido_integraciones_sociales (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas_contenido(id) on delete cascade,
  red text not null check (red in ('instagram', 'linkedin')),
  nombre_cuenta text not null,
  cuenta_externa_id text null,
  access_token text null,
  refresh_token text null,
  token_expires_at timestamptz null,
  activa boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (marca_id, red, cuenta_externa_id)
);

create table if not exists public.contenido_publicaciones_log (
  id uuid primary key default gen_random_uuid(),
  pieza_id uuid not null references public.piezas_contenido(id) on delete cascade,
  integracion_id uuid null references public.contenido_integraciones_sociales(id) on delete set null,
  red text not null check (red in ('instagram', 'linkedin')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'publicando', 'publicado', 'fallido')),
  id_externo text null,
  error text null,
  respuesta jsonb null,
  publicado_at timestamptz null,
  creado_por uuid null references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.contenido_metricas (
  id uuid primary key default gen_random_uuid(),
  pieza_id uuid null references public.piezas_contenido(id) on delete cascade,
  integracion_id uuid null references public.contenido_integraciones_sociales(id) on delete set null,
  red text not null check (red in ('instagram', 'linkedin')),
  fecha date not null,
  impresiones integer not null default 0,
  alcance integer not null default 0,
  me_gusta integer not null default 0,
  comentarios integer not null default 0,
  compartidos integer not null default 0,
  guardados integer not null default 0,
  clics integer not null default 0,
  seguidores_ganados integer not null default 0,
  respuesta_raw jsonb null,
  created_at timestamptz not null default now(),
  unique (pieza_id, red, fecha)
);

create index if not exists marca_identidad_secciones_marca_orden_idx
  on public.marca_identidad_secciones (marca_id, orden);
create index if not exists contenido_publicaciones_log_pieza_idx
  on public.contenido_publicaciones_log (pieza_id, created_at desc);
create index if not exists contenido_metricas_fecha_red_idx
  on public.contenido_metricas (fecha desc, red);

-- La política de acceso se mantiene server-side, igual que el resto de Content Studio.
