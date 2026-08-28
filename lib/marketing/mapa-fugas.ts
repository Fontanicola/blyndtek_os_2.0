export const MAPA_CAMPAIGN_KEY = "instagram_reel_mapa_2026_08";
export const MAPA_CTA_DESTINATION = "https://ig.me/m/blyndtek";

export const MAPA_PROCESS_OPTIONS = [
  "Pedidos",
  "Presupuestos",
  "Cobranzas",
  "Seguimiento comercial",
  "Compras y proveedores",
  "Otro proceso"
] as const;

export type MapaCurrency = "ARS" | "USD";

export type MapaAnswers = {
  proceso: string;
  casos_semanales: number;
  minutos_recarga_por_caso: number;
  minutos_seguimiento_por_caso: number;
  correcciones_semanales: number;
  minutos_por_correccion: number;
  personas_involucradas: number;
  costo_hora: number | null;
  moneda: MapaCurrency;
};

export type MapaLeakKey = "recargas" | "esperas" | "correcciones";
export type MapaSeverity = "baja" | "media" | "alta";

export type MapaResult = {
  proceso: string;
  horas_mensuales: number;
  costo_mensual: number | null;
  moneda: MapaCurrency;
  severidad: MapaSeverity;
  fuga_principal: MapaLeakKey;
  horas_por_fuga: Record<MapaLeakKey, number>;
  recomendacion: string;
  cta_titulo: string;
  cta_texto: string;
  cta_etiqueta: string;
};

const WEEKS_PER_MONTH = 4.33;

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function largestLeak(values: Record<MapaLeakKey, number>): MapaLeakKey {
  return (Object.entries(values) as Array<[MapaLeakKey, number]>).reduce((largest, current) =>
    current[1] > largest[1] ? current : largest
  )[0];
}

export function calculateMapaResult(answers: MapaAnswers): MapaResult {
  const horasPorFuga: Record<MapaLeakKey, number> = {
    recargas: round((answers.casos_semanales * answers.minutos_recarga_por_caso * WEEKS_PER_MONTH) / 60),
    esperas: round((answers.casos_semanales * answers.minutos_seguimiento_por_caso * WEEKS_PER_MONTH) / 60),
    correcciones: round((answers.correcciones_semanales * answers.minutos_por_correccion * WEEKS_PER_MONTH) / 60)
  };
  const horasMensuales = round(Object.values(horasPorFuga).reduce((total, value) => total + value, 0));
  const costoMensual = answers.costo_hora === null ? null : round(horasMensuales * answers.costo_hora, 0);
  const fugaPrincipal = largestLeak(horasPorFuga);
  const severidad: MapaSeverity = horasMensuales < 8 ? "baja" : horasMensuales < 25 ? "media" : "alta";
  const recommendations: Record<MapaLeakKey, string> = {
    recargas: "Empezaría definiendo una única fuente de verdad y eliminando la carga repetida entre canales. Es la mejora con más horas recuperables en tu mapa.",
    esperas: "Empezaría haciendo visibles responsables, estados y próximos pasos. Las alertas y aprobaciones claras suelen recuperar tiempo sin cambiar todo el sistema.",
    correcciones: "Empezaría estandarizando la entrada de datos y agregando validaciones antes de avanzar. Corregir al inicio cuesta mucho menos que rehacer al final."
  };
  const cta = {
    baja: { titulo: "Tu proceso está razonablemente controlado", texto: "Guardá el diagnóstico y repetilo en 30 días para confirmar que la fuga no crece.", etiqueta: "Seguir aprendiendo con Blyndtek" },
    media: { titulo: "Hay una mejora concreta para priorizar", texto: "Volvé al DM de Instagram y escribí RESULTADO. Te indicamos qué punto revisar primero, sin reunión.", etiqueta: "Enviar RESULTADO por Instagram" },
    alta: { titulo: "La fuga ya justifica una revisión", texto: "Mostranos este resultado y te ayudamos a ordenar un primer plan de acción sobre el proceso más crítico.", etiqueta: "Revisar mi resultado con Blyndtek" }
  }[severidad];

  return {
    proceso: answers.proceso,
    horas_mensuales: horasMensuales,
    costo_mensual: costoMensual,
    moneda: answers.moneda,
    severidad,
    fuga_principal: fugaPrincipal,
    horas_por_fuga: horasPorFuga,
    recomendacion: recommendations[fugaPrincipal],
    cta_titulo: cta.titulo,
    cta_texto: cta.texto,
    cta_etiqueta: cta.etiqueta
  };
}

export function isMapaAnswers(value: unknown): value is MapaAnswers {
  if (!value || typeof value !== "object") return false;
  const answer = value as Record<string, unknown>;
  const bounded = (key: string, min: number, max: number) => {
    const number = answer[key];
    return typeof number === "number" && Number.isFinite(number) && number >= min && number <= max;
  };

  return (
    typeof answer.proceso === "string" && answer.proceso.trim().length > 0 && answer.proceso.length <= 120 &&
    bounded("casos_semanales", 0, 100_000) && bounded("minutos_recarga_por_caso", 0, 1_440) &&
    bounded("minutos_seguimiento_por_caso", 0, 1_440) && bounded("correcciones_semanales", 0, 100_000) &&
    bounded("minutos_por_correccion", 0, 1_440) && bounded("personas_involucradas", 1, 10_000) &&
    (answer.costo_hora === null || bounded("costo_hora", 0, 10_000_000)) &&
    (answer.moneda === "ARS" || answer.moneda === "USD")
  );
}

export const MAPA_LEAK_LABELS: Record<MapaLeakKey, string> = {
  recargas: "Recargas de información",
  esperas: "Seguimientos y esperas",
  correcciones: "Correcciones y retrabajo"
};
