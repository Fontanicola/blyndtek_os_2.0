import type {
  Cotizacion,
  CreateCotizacionInput,
  EstadoCotizacion,
  Hito,
  UpdateCotizacionInput
} from "@/types/cotizaciones";

export const COTIZACION_ESTADOS: EstadoCotizacion[] = [
  "borrador",
  "enviada",
  "aceptada",
  "rechazada"
];

export const COTIZACION_ESTADO_LABELS: Record<EstadoCotizacion, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada"
};

export function createDefaultHito(): Hito {
  return {
    id: crypto.randomUUID(),
    nombre: "Anticipo",
    pct: 50,
    monto: 0
  };
}

export function calculateHitoMonto(precioTotal: number | null, pct: number) {
  if (!precioTotal || precioTotal <= 0) {
    return 0;
  }

  return Number(((precioTotal * pct) / 100).toFixed(2));
}

export function normalizeHitos(precioTotal: number | null, hitos: Hito[] | undefined): Hito[] {
  const source = hitos && hitos.length > 0 ? hitos : [createDefaultHito()];

  return source.map((hito) => ({
    ...hito,
    monto: calculateHitoMonto(precioTotal, hito.pct)
  }));
}

export function createCotizacionDraft(input?: CreateCotizacionInput): CreateCotizacionInput {
  return {
    empresa: input?.empresa ?? "Nueva cotización",
    lead_id: input?.lead_id,
    cliente_id: input?.cliente_id,
    precio_total: input?.precio_total,
    mantenimiento_mensual: input?.mantenimiento_mensual,
    plazo_semanas: input?.plazo_semanas,
    hitos: normalizeHitos(input?.precio_total ?? null, input?.hitos)
  };
}

export function normalizeCotizacionPayload(
  payload: CreateCotizacionInput | UpdateCotizacionInput
): CreateCotizacionInput | UpdateCotizacionInput {
  const nextPayload = { ...payload };

  if ("hitos" in nextPayload && nextPayload.hitos) {
    nextPayload.hitos = normalizeHitos(
      "precio_total" in nextPayload ? nextPayload.precio_total ?? null : null,
      nextPayload.hitos
    );
  }

  if ("contexto_chat" in nextPayload && nextPayload.contexto_chat) {
    nextPayload.contexto_chat = [...nextPayload.contexto_chat];
  }

  if ("adjuntos" in nextPayload && nextPayload.adjuntos) {
    nextPayload.adjuntos = [...nextPayload.adjuntos];
  }

  if ("beneficios" in nextPayload && nextPayload.beneficios) {
    nextPayload.beneficios = nextPayload.beneficios.map((beneficio) => ({ ...beneficio }));
  }

  if ("por_que_nosotros" in nextPayload && nextPayload.por_que_nosotros) {
    nextPayload.por_que_nosotros = nextPayload.por_que_nosotros.map((item) => ({ ...item }));
  }

  if ("supuestos" in nextPayload && nextPayload.supuestos) {
    nextPayload.supuestos = [...nextPayload.supuestos];
  }

  if ("condiciones_comerciales" in nextPayload && nextPayload.condiciones_comerciales) {
    nextPayload.condiciones_comerciales = [...nextPayload.condiciones_comerciales];
  }

  if ("mantenimiento_detalle" in nextPayload && nextPayload.mantenimiento_detalle) {
    nextPayload.mantenimiento_detalle = {
      incluye: nextPayload.mantenimiento_detalle.incluye.map((entry) => ({
        categoria: entry.categoria,
        items: [...entry.items]
      })),
      no_incluye: [...nextPayload.mantenimiento_detalle.no_incluye]
    };
  }

  if ("datos_propuesta" in nextPayload && nextPayload.datos_propuesta) {
    nextPayload.datos_propuesta = {
      ...nextPayload.datos_propuesta,
      firmantes: nextPayload.datos_propuesta.firmantes.map((firmante) => ({ ...firmante }))
    };
  }

  return nextPayload;
}

export function formatCurrency(value: number | null) {
  if (value === null) {
    return "—";
  }

  return `$${value.toLocaleString("en-US")} USD`;
}

export function isParametrosStepComplete(cotizacion: Cotizacion) {
  const empresaOk = cotizacion.empresa.trim().length > 0;
  const precioOk = (cotizacion.precio_total ?? 0) > 0;
  const hitos = cotizacion.hitos.length > 0 ? cotizacion.hitos : [createDefaultHito()];
  const pctTotal = hitos.reduce((sum, hito) => sum + hito.pct, 0);

  return empresaOk && precioOk && pctTotal === 100;
}
