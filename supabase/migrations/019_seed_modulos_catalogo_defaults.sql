-- Catálogo base para que el diagnóstico pueda generar propuestas desde el primer uso.
-- Idempotente: no duplica módulos si ya existen por nombre.

insert into public.modulos_catalogo (
  nombre,
  descripcion,
  categoria,
  precio_ideal,
  precio_minimo,
  incremento_mensual,
  activo
)
select *
from (
  values
    (
      'CRM comercial y seguimiento',
      'Gestión de consultas, clientes potenciales, estados de seguimiento, próximos pasos y trazabilidad comercial.',
      'Comercial',
      1800,
      1200,
      150,
      true
    ),
    (
      'Gestión de pedidos y operaciones',
      'Carga, seguimiento y priorización de pedidos u órdenes internas desde que entran hasta que se resuelven.',
      'Operación',
      2200,
      1500,
      180,
      true
    ),
    (
      'Agenda, turnos y recordatorios',
      'Calendario operativo con vencimientos, recordatorios, responsables y alertas para no perder tareas críticas.',
      'Operación',
      1500,
      950,
      120,
      true
    ),
    (
      'Inventario y stock',
      'Control de productos, movimientos, mínimos, faltantes y alertas para evitar quiebres o compras desordenadas.',
      'Operación',
      2400,
      1600,
      180,
      true
    ),
    (
      'Facturación, cobranzas y pagos',
      'Registro de facturas, cobros pendientes, pagos recibidos, vencimientos y estado financiero por cliente o pedido.',
      'Finanzas',
      2100,
      1400,
      160,
      true
    ),
    (
      'Dashboard de gestión',
      'Panel ejecutivo con métricas clave, indicadores de operación, ventas, finanzas y alertas accionables.',
      'Control',
      1800,
      1200,
      150,
      true
    ),
    (
      'Portal interno multiusuario',
      'Accesos por rol, permisos, perfiles de usuario y vistas diferenciadas para equipo, administración y dirección.',
      'Plataforma',
      1700,
      1100,
      140,
      true
    ),
    (
      'Automatizaciones y notificaciones',
      'Flujos automáticos para avisos, cambios de estado, recordatorios y tareas recurrentes conectadas al proceso real.',
      'Automatización',
      1900,
      1250,
      170,
      true
    )
) as defaults(nombre, descripcion, categoria, precio_ideal, precio_minimo, incremento_mensual, activo)
where not exists (
  select 1
  from public.modulos_catalogo existing
  where lower(existing.nombre) = lower(defaults.nombre)
);
