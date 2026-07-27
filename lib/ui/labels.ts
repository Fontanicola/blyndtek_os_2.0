const labels: Record<string, string> = {
  en_proceso: "En proceso",
  en_curso: "En curso",
  pr_abierto: "Pull request abierto",
  informe_generado: "Informe generado",
  diagnostico_ofrecido: "Diagnóstico ofrecido",
  diagnostico_pagado: "Diagnóstico pagado",
  pendiente: "Pendiente",
  facturado: "Facturado",
  cobrado: "Cobrado",
  vencido: "Con atraso",
  pagado: "Pagado",
  pagada: "Pagada",
  cancelada: "Cancelada",
  activa: "Activa",
  pausada: "Pausada",
  baja: "Baja",
  realizada: "Realizada",
  programada: "Programada",
  detectada: "Detectada",
  contactada: "Contactada",
  propuesta: "Propuesta",
  ganada: "Ganada",
  perdida: "Perdida",
  abierto: "Abierto",
  en_progreso: "En progreso",
  esperando_cliente: "Esperando al cliente",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
  one_pay: "Pago único",
  hito: "Hito",
  mantenimiento: "Mantenimiento",
  brick: "Brick",
  diagnostico: "Diagnóstico",
  otro: "Otro",
  dominios: "Dominios",
  hosting_infraestructura: "Hosting e infraestructura",
  herramientas_software: "Herramientas de software",
  marketing_ads: "Marketing y publicidad",
  impuestos_contable: "Impuestos y contabilidad",
  sueldos_honorarios: "Sueldos y honorarios",
  comisiones: "Comisiones"
};

export function labelEstado(value: string | null | undefined) {
  if (!value) return "Sin estado";
  return labels[value] ?? value.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase());
}

export const estadoLabels = labels;
