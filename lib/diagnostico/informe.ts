import { createAdminClient } from "@/lib/supabase/admin";

export type HallazgoInforme = {
  hallazgo: string;
  impacto: string;
  que_resolveria: string;
  evidencia?: string;
  severidad?: string;
};

export type ModuloInforme = {
  nombre: string;
  descripcion: string | null;
  categoria?: string | null;
  justificacion: string;
  problema_resuelve?: string;
  impacto_esperado?: string;
  funcionalidades?: string[];
  tiempo_estimado_semanas?: number | null;
  prioridad?: string | null;
};

export type DiagnosticoEmpresa = {
  resumen_ejecutivo: string;
  operativa_actual: string;
  problemas_principales: string[];
  costo_de_no_cambiar: string;
  oportunidades_mejora: string[];
  conclusion_diagnostico: string;
};

export type PropuestaSoftware = {
  vision_sistema: string;
  alcance_general: string;
  beneficios_esperados: string[];
  roadmap_implementacion: Array<{
    etapa: string;
    descripcion: string;
    duracion_estimada: string;
    subtareas: string[];
  }>;
  supuestos: string[];
  proximos_pasos: string[];
};

export type CondicionesComercialesPropuesta = {
  precio_desarrollo_usd: number;
  adelanto_pct: number;
  fecha_adelanto: string | null;
  cantidad_cuotas: number;
  dia_pago: number;
  fecha_primera_cuota: string | null;
  mantenimiento_mensual_usd: number;
  dia_facturacion_mantenimiento: number | null;
};

export type AntesDespuesMetrica = {
  area: string;
  antes: string;
  despues: string;
  metrica: string;
};

export type AreaHeatmap = {
  area: string;
  nivel: number;
  diagnostico: string;
  oportunidad: string;
};

export type DiagnosticoInformeRecord = {
  id: string;
  token_publico: string;
  informe_hallazgos: unknown;
  modulos_sugeridos: unknown;
  precio_ideal_desarrollo: number | null;
  precio_ideal_mensual: number | null;
  estado: string;
  created_at?: string;
  lead?: {
    empresa: string;
    contacto_1_nombre: string | null;
  } | null;
};

export type DiagnosticoInformeView = {
  record: DiagnosticoInformeRecord;
  empresa: string;
  contacto: string | null;
  hallazgos: HallazgoInforme[];
  modulos: ModuloInforme[];
  diagnosticoEmpresa: DiagnosticoEmpresa;
  propuestaSoftware: PropuestaSoftware;
  condicionesComerciales: CondicionesComercialesPropuesta;
  antesDespues: AntesDespuesMetrica[];
  mapaAreas: AreaHeatmap[];
  precio_ideal_desarrollo: number;
  precio_ideal_mensual: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseHallazgos(value: unknown): HallazgoInforme[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const hallazgo = typeof item.hallazgo === "string" ? item.hallazgo.trim() : "";
    const impacto = typeof item.impacto === "string" ? item.impacto.trim() : "";
    const queResolveria = typeof item.que_resolveria === "string" ? item.que_resolveria.trim() : "";
    const evidencia = typeof item.evidencia === "string" ? item.evidencia.trim() : "";
    const severidad = typeof item.severidad === "string" ? item.severidad.trim() : "";

    if (!hallazgo || !impacto || !queResolveria) {
      return [];
    }

    return [{ hallazgo, impacto, que_resolveria: queResolveria, evidencia, severidad }];
  });
}

export function parseModulos(value: unknown): ModuloInforme[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const nombre = typeof item.nombre === "string" ? item.nombre.trim() : "";
    const descripcion = typeof item.descripcion === "string" ? item.descripcion.trim() : null;
    const categoria = typeof item.categoria === "string" ? item.categoria.trim() : null;
    const justificacion = typeof item.justificacion === "string" ? item.justificacion.trim() : "";
    const problemaResuelve = typeof item.problema_resuelve === "string" ? item.problema_resuelve.trim() : "";
    const impactoEsperado = typeof item.impacto_esperado === "string" ? item.impacto_esperado.trim() : "";
    const prioridad = typeof item.prioridad === "string" ? item.prioridad.trim() : null;
    const tiempoEstimado =
      typeof item.tiempo_estimado_semanas === "number" && Number.isFinite(item.tiempo_estimado_semanas)
        ? item.tiempo_estimado_semanas
        : null;
    const funcionalidades = Array.isArray(item.funcionalidades)
      ? item.funcionalidades.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];

    if (!nombre) {
      return [];
    }

    return [
      {
        nombre,
        descripcion,
        categoria,
        justificacion,
        problema_resuelve: problemaResuelve,
        impacto_esperado: impactoEsperado,
        funcionalidades,
        tiempo_estimado_semanas: tiempoEstimado,
        prioridad
      }
    ];
  });
}

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function parseDiagnosticoEmpresa(value: unknown, hallazgos: HallazgoInforme[]): DiagnosticoEmpresa {
  const fallbackResumen =
    hallazgos.length > 0
      ? "El diagnóstico muestra una operación con oportunidades claras de digitalización, trazabilidad y automatización."
      : "El diagnóstico está generado y listo para revisión.";

  if (!isRecord(value)) {
    return {
      resumen_ejecutivo: fallbackResumen,
      operativa_actual: "La operación actual fue relevada a partir de las respuestas del diagnóstico.",
      problemas_principales: hallazgos.map((hallazgo) => hallazgo.hallazgo),
      costo_de_no_cambiar: "Mantener la operación sin sistema sostiene dependencia manual, pérdida de visibilidad y riesgo de errores.",
      oportunidades_mejora: hallazgos.map((hallazgo) => hallazgo.que_resolveria),
      conclusion_diagnostico: "Hay base suficiente para avanzar con una propuesta de sistema a medida."
    };
  }

  return {
    resumen_ejecutivo:
      typeof value.resumen_ejecutivo === "string" ? value.resumen_ejecutivo : fallbackResumen,
    operativa_actual:
      typeof value.operativa_actual === "string"
        ? value.operativa_actual
        : "La operación actual fue relevada a partir de las respuestas del diagnóstico.",
    problemas_principales: parseStringArray(value.problemas_principales),
    costo_de_no_cambiar:
      typeof value.costo_de_no_cambiar === "string"
        ? value.costo_de_no_cambiar
        : "Mantener la operación sin sistema sostiene dependencia manual, pérdida de visibilidad y riesgo de errores.",
    oportunidades_mejora: parseStringArray(value.oportunidades_mejora),
    conclusion_diagnostico:
      typeof value.conclusion_diagnostico === "string"
        ? value.conclusion_diagnostico
        : "Hay base suficiente para avanzar con una propuesta de sistema a medida."
  };
}

export function parsePropuestaSoftware(value: unknown, modulos: ModuloInforme[]): PropuestaSoftware {
  if (!isRecord(value)) {
    return {
      vision_sistema: "Construir un sistema operativo propio para centralizar la información crítica y ordenar el trabajo diario.",
      alcance_general: "El alcance inicial se organiza alrededor de los módulos sugeridos en esta propuesta.",
      beneficios_esperados: modulos
        .map((modulo) => modulo.impacto_esperado || modulo.justificacion)
        .filter(Boolean),
      roadmap_implementacion: [
        {
          etapa: "Relevamiento y diseño funcional",
          descripcion: "Aterrizar el flujo real, roles, pantallas y prioridades del sistema.",
          duracion_estimada: "1 semana",
          subtareas: [
            "Relevar flujos actuales con responsables",
            "Definir entidades, permisos y pantallas críticas",
            "Cerrar alcance funcional antes de construir"
          ]
        },
        {
          etapa: "Construcción del MVP operativo",
          descripcion: "Desarrollar los módulos principales y validar el uso con datos reales.",
          duracion_estimada: "3 a 5 semanas",
          subtareas: [
            "Construir módulos priorizados",
            "Conectar registros, estados y tableros",
            "Probar con casos reales de la operación"
          ]
        },
        {
          etapa: "Implementación y ajustes",
          descripcion: "Capacitar al equipo, ajustar fricciones y dejar el sistema listo para operar.",
          duracion_estimada: "1 a 2 semanas",
          subtareas: [
            "Capacitar usuarios clave",
            "Ajustar fricciones detectadas en uso real",
            "Dejar tablero de seguimiento y próximos pasos"
          ]
        }
      ],
      supuestos: ["El alcance final se confirma en una reunión de cierre antes de iniciar el desarrollo."],
      proximos_pasos: ["Revisar la propuesta", "Priorizar módulos", "Cerrar alcance, inversión y fecha de inicio"]
    };
  }

  return {
    vision_sistema:
      typeof value.vision_sistema === "string"
        ? value.vision_sistema
        : "Construir un sistema operativo propio para centralizar la información crítica y ordenar el trabajo diario.",
    alcance_general:
      typeof value.alcance_general === "string"
        ? value.alcance_general
        : "El alcance inicial se organiza alrededor de los módulos sugeridos en esta propuesta.",
    beneficios_esperados: parseStringArray(value.beneficios_esperados),
    roadmap_implementacion: Array.isArray(value.roadmap_implementacion)
      ? value.roadmap_implementacion.flatMap((item) => {
          if (!isRecord(item)) {
            return [];
          }

          const etapa = typeof item.etapa === "string" ? item.etapa : "";
          const descripcion = typeof item.descripcion === "string" ? item.descripcion : "";
          const duracion = typeof item.duracion_estimada === "string" ? item.duracion_estimada : "";
          const subtareas = parseStringArray(item.subtareas);

          return etapa && descripcion
            ? [{ etapa, descripcion, duracion_estimada: duracion || "A definir", subtareas }]
            : [];
        })
      : [],
    supuestos: parseStringArray(value.supuestos),
    proximos_pasos: parseStringArray(value.proximos_pasos)
  };
}

export function parseCondicionesComerciales(
  value: unknown,
  precioDesarrollo: number,
  precioMensual: number
): CondicionesComercialesPropuesta {
  const record = isRecord(value) ? value : {};
  const adelantoPct = Number(record.adelanto_pct ?? 25);
  const cantidadCuotas = Number(record.cantidad_cuotas ?? 1);
  const diaPago = Number(record.dia_pago ?? 10);
  const mantenimientoMensual = Number(record.mantenimiento_mensual_usd ?? precioMensual ?? 0);
  const diaFacturacion = record.dia_facturacion_mantenimiento == null ? null : Number(record.dia_facturacion_mantenimiento);

  return {
    precio_desarrollo_usd: Number(record.precio_desarrollo_usd ?? precioDesarrollo ?? 0),
    adelanto_pct: Number.isFinite(adelantoPct) ? Math.min(100, Math.max(0, adelantoPct)) : 25,
    fecha_adelanto: typeof record.fecha_adelanto === "string" ? record.fecha_adelanto : null,
    cantidad_cuotas: Number.isInteger(cantidadCuotas) && cantidadCuotas > 0 ? cantidadCuotas : 1,
    dia_pago: Number.isInteger(diaPago) ? Math.min(28, Math.max(1, diaPago)) : 10,
    fecha_primera_cuota: typeof record.fecha_primera_cuota === "string" ? record.fecha_primera_cuota : null,
    mantenimiento_mensual_usd: Number.isFinite(mantenimientoMensual) && mantenimientoMensual > 0 ? mantenimientoMensual : 0,
    dia_facturacion_mantenimiento:
      Number.isInteger(diaFacturacion) && diaFacturacion ? Math.min(28, Math.max(1, diaFacturacion)) : null
  };
}

export function parseAntesDespues(value: unknown, hallazgos: HallazgoInforme[]): AntesDespuesMetrica[] {
  const parsed = Array.isArray(value)
    ? value.flatMap((item) => {
        if (!isRecord(item)) {
          return [];
        }

        const area = typeof item.area === "string" ? item.area.trim() : "";
        const antes = typeof item.antes === "string" ? item.antes.trim() : "";
        const despues = typeof item.despues === "string" ? item.despues.trim() : "";
        const metrica = typeof item.metrica === "string" ? item.metrica.trim() : "";

        return area && antes && despues && metrica ? [{ area, antes, despues, metrica }] : [];
      })
    : [];

  if (parsed.length > 0) {
    return parsed.slice(0, 6);
  }

  return hallazgos.slice(0, 4).map((hallazgo, index) => ({
    area: hallazgo.hallazgo.split(":")[0]?.trim() || `Área ${index + 1}`,
    antes: hallazgo.impacto,
    despues: hallazgo.que_resolveria,
    metrica: "Menos seguimiento manual, más trazabilidad y menor riesgo operativo."
  }));
}

export function parseMapaAreas(value: unknown, hallazgos: HallazgoInforme[]): AreaHeatmap[] {
  const parsed = Array.isArray(value)
    ? value.flatMap((item) => {
        if (!isRecord(item)) {
          return [];
        }

        const area = typeof item.area === "string" ? item.area.trim() : "";
        const nivelRaw = typeof item.nivel === "number" ? item.nivel : Number(item.nivel);
        const diagnostico = typeof item.diagnostico === "string" ? item.diagnostico.trim() : "";
        const oportunidad = typeof item.oportunidad === "string" ? item.oportunidad.trim() : "";
        const nivel = Number.isFinite(nivelRaw) ? Math.min(5, Math.max(1, Math.round(nivelRaw))) : 3;

        return area && diagnostico && oportunidad ? [{ area, nivel, diagnostico, oportunidad }] : [];
      })
    : [];

  if (parsed.length > 0) {
    return parsed.slice(0, 8);
  }

  const defaultAreas = ["Comercial", "Operación", "Administración", "Finanzas", "Control", "Equipo"];

  return defaultAreas.map((area, index) => {
    const hallazgo = hallazgos[index % Math.max(hallazgos.length, 1)];

    return {
      area,
      nivel: hallazgo?.severidad?.toLowerCase().includes("alta") ? 4 : 3,
      diagnostico: hallazgo?.hallazgo ?? "Área con oportunidad de orden y digitalización.",
      oportunidad: hallazgo?.que_resolveria ?? "Centralizar información, responsables y seguimiento."
    };
  });
}

export function formatInformeCurrency(value: number | null | undefined) {
  return `$${Number(value ?? 0).toLocaleString("en-US", {
    maximumFractionDigits: 0
  })} USD`;
}

export function sanitizePdfFilename(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return normalized || "diagnostico";
}

export async function fetchDiagnosticoInforme(token: string): Promise<DiagnosticoInformeView | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("diagnosticos")
    .select(
      "id, token_publico, informe_hallazgos, modulos_sugeridos, precio_ideal_desarrollo, precio_ideal_mensual, estado, created_at, lead:leads(empresa, contacto_1_nombre)"
    )
    .eq("token_publico", token)
    .maybeSingle<DiagnosticoInformeRecord>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.estado !== "informe_generado") {
    return null;
  }

  const hallazgos = parseHallazgos(
    isRecord(data.informe_hallazgos) ? data.informe_hallazgos.hallazgos : data.informe_hallazgos
  );
  const modulos = parseModulos(
    isRecord(data.modulos_sugeridos) ? data.modulos_sugeridos.modulos : data.modulos_sugeridos
  );
  const informeHallazgos = isRecord(data.informe_hallazgos) ? data.informe_hallazgos : null;

  return {
    record: data,
    empresa: data.lead?.empresa ?? "tu operación",
    contacto: data.lead?.contacto_1_nombre ?? null,
    hallazgos,
    modulos,
    diagnosticoEmpresa: parseDiagnosticoEmpresa(
      informeHallazgos ? informeHallazgos.diagnostico_empresa : null,
      hallazgos
    ),
    propuestaSoftware: parsePropuestaSoftware(
      isRecord(data.modulos_sugeridos) ? data.modulos_sugeridos.propuesta_software : null,
      modulos
    ),
    condicionesComerciales: parseCondicionesComerciales(
      isRecord(data.modulos_sugeridos) ? data.modulos_sugeridos.condiciones_comerciales : null,
      Number(data.precio_ideal_desarrollo ?? 0),
      Number(data.precio_ideal_mensual ?? 0)
    ),
    antesDespues: parseAntesDespues(informeHallazgos ? informeHallazgos.antes_despues : null, hallazgos),
    mapaAreas: parseMapaAreas(informeHallazgos ? informeHallazgos.mapa_areas : null, hallazgos),
    precio_ideal_desarrollo: Number(data.precio_ideal_desarrollo ?? 0),
    precio_ideal_mensual: Number(data.precio_ideal_mensual ?? 0)
  };
}
