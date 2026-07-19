export type PublicFeatureState = "pendiente" | "en_curso" | "lista";

export type PublicRoadmapFeature = {
  nombre: string;
  estado: PublicFeatureState;
};

export type PublicRoadmapPhaseState = "completada" | "en_curso" | "pendiente";

export type PublicRoadmapPhase = {
  id: string;
  nombre: string;
  estado: PublicRoadmapPhaseState;
  fecha_estimada_inicio: string | null;
  fecha_estimada_fin: string | null;
  descripcion: string | null;
  features_totales: number;
  features_completadas: number;
  features: PublicRoadmapFeature[];
};

export type PublicRoadmapPayment = {
  concepto: string;
  monto: number;
  fecha_vencimiento: string;
  estado: "pendiente" | "facturado" | "cobrado" | "vencido";
};

export type PublicRoadmapPaymentSummary = {
  total_contrato: number;
  total_pagado: number;
  total_pendiente: number;
  hitos: PublicRoadmapPayment[];
};

export type PublicRoadmapCredentials = {
  usuario: string | null;
  contraseña: string | null;
  notas: string | null;
};

export type PublicRoadmapProject = {
  nombre: string;
  estado: string;
  avance_pct: number;
  fecha_inicio: string | null;
  entrega_comprometida: string | null;
  fases: PublicRoadmapPhase[];
  ultima_actualizacion: string | null;
  url_sistema: string | null;
  imagen_sistema_storage_path: string | null;
  tiene_pin: boolean;
  pagos: PublicRoadmapPaymentSummary;
};
