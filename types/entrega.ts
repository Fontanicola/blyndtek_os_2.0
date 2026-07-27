export type DeliveryHandoffStatus = "ready" | "attention";

export type DeliveryHandoffPhase = {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  estado: string;
  features_total: number;
  tareas_total: number;
  features_completadas: number;
  criterio_aceptacion: string | null;
  responsable_cliente: string | null;
};

export type DeliveryHandoff = {
  proyecto: {
    id: string;
    nombre: string;
    estado: string;
    responsable: { id: string; nombre: string } | null;
    devs: Array<{ id: string; nombre: string }>;
    fecha_inicio: string | null;
    entrega_comprometida: string | null;
    roadmap_url: string | null;
  };
  cliente: { id: string; empresa: string } | null;
  propuesta: {
    id: string | null;
    aceptada: boolean;
    alcance: string | null;
    resumen: string | null;
    modulos: Array<{ nombre: string; descripcion: string | null }>;
    beneficios: string[];
    condiciones: {
      precio_desarrollo: number | null;
      mantenimiento_mensual: number | null;
      adelanto_pct: number | null;
      cantidad_cuotas: number | null;
    };
  };
  contrato: {
    existe: boolean;
    estado: string | null;
    valor_total: number | null;
    descuento_diagnostico_usd: number;
    cobros_pendientes: number;
  };
  fases: DeliveryHandoffPhase[];
  checklist: Array<{
    clave: string;
    label: string;
    completo: boolean;
    detalle: string;
  }>;
  pendientes: string[];
  status: DeliveryHandoffStatus;
};
