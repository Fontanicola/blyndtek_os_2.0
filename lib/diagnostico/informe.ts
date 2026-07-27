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
  contexto_empresa: string;
  dependencias_criticas: string[];
  riesgos_operativos: string[];
  prioridades_90_dias: string[];
  indicadores_clave: Array<{
    nombre: string;
    lectura_actual: string;
    por_que_importa: string;
  }>;
  problemas_principales: string[];
  costo_de_no_cambiar: string;
  oportunidades_mejora: string[];
  conclusion_diagnostico: string;
  costo_mensual_estimado_usd?: number;
  costo_anual_estimado_usd?: number;
  confianza_cuantificacion?: "alta" | "media" | "baja";
};

export type PropuestaSoftware = {
  vision_sistema: string;
  alcance_general: string;
  modelo_operativo: string;
  beneficios_esperados: string[];
  entregables: string[];
  fuera_de_alcance: string[];
  criterios_exito: string[];
  roadmap_implementacion: Array<{
    etapa: string;
    descripcion: string;
    duracion_estimada: string;
    subtareas: string[];
    entregables: string[];
    criterio_aceptacion: string;
    responsable_cliente: string;
  }>;
  supuestos: string[];
  proximos_pasos: string[];
  condiciones_operativas: {
    propiedad_sistema: string;
    soporte_mantenimiento: string;
    cambios_alcance: string;
    datos_y_migracion: string;
  };
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

export type HitoPagoPropuesta = {
  numero: number;
  nombre: string;
  fase_referencia: string | null;
  porcentaje: number;
  monto_usd: number;
  momento: string;
};

export function construirHitosPago(
  condiciones: CondicionesComercialesPropuesta,
  roadmap: PropuestaSoftware["roadmap_implementacion"]
): HitoPagoPropuesta[] {
  const precio = Math.max(0, condiciones.precio_desarrollo_usd);
  const adelantoPct = Math.min(100, Math.max(0, condiciones.adelanto_pct));
  const cantidadCuotas = Math.max(1, Math.round(condiciones.cantidad_cuotas));
  const saldoPct = Math.max(0, 100 - adelantoPct);
  const hitos: HitoPagoPropuesta[] = [];

  if (adelantoPct > 0) {
    hitos.push({
      numero: 1,
      nombre: "Inicio del proyecto",
      fase_referencia: roadmap[0]?.etapa ?? null,
      porcentaje: adelantoPct,
      monto_usd: Number((precio * adelantoPct / 100).toFixed(2)),
      momento: "Al aprobar la propuesta y reservar el inicio"
    });
  }

  const cuotaPct = saldoPct / cantidadCuotas;
  const cuotaMonto = precio * cuotaPct / 100;
  for (let index = 0; index < cantidadCuotas; index += 1) {
    const fase = roadmap[index] ?? roadmap[roadmap.length - 1];
    hitos.push({
      numero: hitos.length + 1,
      nombre: fase ? `Hito ${index + 1} · ${fase.etapa}` : `Hito ${index + 1} · Entrega validada`,
      fase_referencia: fase?.etapa ?? null,
      porcentaje: Number(cuotaPct.toFixed(2)),
      monto_usd: Number(cuotaMonto.toFixed(2)),
      momento: fase ? `Al validar los entregables de ${fase.etapa}` : "Contra entrega y validación del avance"
    });
  }

  const diferencia = Number((precio - hitos.reduce((total, hito) => total + hito.monto_usd, 0)).toFixed(2));
  if (hitos.length > 0 && diferencia !== 0) {
    const ultimoHito = hitos[hitos.length - 1];
    if (ultimoHito) {
      ultimoHito.monto_usd = Number((ultimoHito.monto_usd + diferencia).toFixed(2));
    }
  }

  return hitos;
}

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
  respuestas?: Record<string, string> | null;
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
  cuantificacion: {
    total_mensual_usd: number;
    total_anual_usd: number;
    metricas_con_datos: number;
    confianza: "alta" | "media" | "baja";
  } | null;
  precio_ideal_desarrollo: number;
  precio_ideal_mensual: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeForComparison(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function isVerbatimResponse(value: string, respuestas: Record<string, string> | null | undefined) {
  const normalized = normalizeForComparison(value);
  return Object.values(respuestas ?? {}).some((response) => {
    const candidate = normalizeForComparison(response);
    return candidate.length >= 48 && (normalized.includes(candidate) || candidate.includes(normalized));
  });
}

function safeVisibleText(value: string, fallback: string, respuestas?: Record<string, string> | null) {
  return !value || isVerbatimResponse(value, respuestas) || value.includes("¿") || value.includes("?") ? fallback : value;
}

export function parseHallazgos(value: unknown, respuestas?: Record<string, string> | null): HallazgoInforme[] {
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

    return [
      {
        hallazgo: safeVisibleText(hallazgo, "Se detecta una dependencia operativa que requiere mayor trazabilidad.", respuestas),
        impacto: safeVisibleText(impacto, "El control manual aumenta el reproceso y retrasa la detección de desvíos.", respuestas),
        que_resolveria: safeVisibleText(queResolveria, "Centralizar el proceso con estados, responsables y alertas accionables.", respuestas),
        evidencia: safeVisibleText(evidencia, "La información relevada muestra controles distribuidos que conviene unificar.", respuestas),
        severidad
      }
    ];
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

function parseConsultingStringArray(value: unknown, respuestas?: Record<string, string> | null) {
  return Array.from(
    new Set(
      parseStringArray(value)
        .filter((item) => !isVerbatimResponse(item, respuestas))
        .filter((item) => !normalizeForComparison(item).startsWith("un sistema a medida permitiria ordenar este flujo"))
        .map((item) => item.trim())
    )
  );
}

export function parseDiagnosticoEmpresa(value: unknown, hallazgos: HallazgoInforme[], respuestas?: Record<string, string> | null): DiagnosticoEmpresa {
  const fallbackResumen =
    hallazgos.length > 0
      ? "El diagnóstico muestra una operación con oportunidades claras de digitalización, trazabilidad y automatización."
      : "El diagnóstico está generado y listo para revisión.";

  if (!isRecord(value)) {
    return {
      resumen_ejecutivo: fallbackResumen,
      operativa_actual: "La operación actual fue relevada a partir de las respuestas del diagnóstico.",
      contexto_empresa: "La empresa presenta una operación con múltiples puntos de coordinación que requieren visibilidad transversal.",
      dependencias_criticas: [],
      riesgos_operativos: [],
      prioridades_90_dias: [],
      indicadores_clave: [],
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
    contexto_empresa:
      typeof value.contexto_empresa === "string" ? value.contexto_empresa : "La empresa presenta una operación con múltiples puntos de coordinación que requieren visibilidad transversal.",
    dependencias_criticas: parseConsultingStringArray(value.dependencias_criticas, respuestas),
    riesgos_operativos: parseConsultingStringArray(value.riesgos_operativos, respuestas),
    prioridades_90_dias: parseConsultingStringArray(value.prioridades_90_dias, respuestas),
    indicadores_clave: Array.isArray(value.indicadores_clave)
      ? value.indicadores_clave.flatMap((item) => {
          if (!isRecord(item)) return [];
          const nombre = typeof item.nombre === "string" ? item.nombre.trim() : "";
          const lecturaActual = typeof item.lectura_actual === "string" ? item.lectura_actual.trim() : "";
          const porQueImporta = typeof item.por_que_importa === "string" ? item.por_que_importa.trim() : "";
          return nombre && lecturaActual && porQueImporta && !isVerbatimResponse(lecturaActual, respuestas)
            ? [{ nombre, lectura_actual: lecturaActual, por_que_importa: porQueImporta }]
            : [];
        }).slice(0, 8)
      : [],
    problemas_principales:
      parseConsultingStringArray(value.problemas_principales, respuestas).length > 0
        ? parseConsultingStringArray(value.problemas_principales, respuestas)
        : hallazgos.map((hallazgo) => hallazgo.hallazgo),
    costo_de_no_cambiar:
      typeof value.costo_de_no_cambiar === "string"
        ? value.costo_de_no_cambiar
        : "Mantener la operación sin sistema sostiene dependencia manual, pérdida de visibilidad y riesgo de errores.",
    oportunidades_mejora:
      parseConsultingStringArray(value.oportunidades_mejora, respuestas).length > 0
        ? parseConsultingStringArray(value.oportunidades_mejora, respuestas)
        : hallazgos.map((hallazgo) => hallazgo.que_resolveria),
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
      modelo_operativo: "Blyndtek implementa el sistema por fases, validando cada flujo con usuarios clave antes de avanzar al siguiente bloque.",
      beneficios_esperados: modulos
        .map((modulo) => modulo.impacto_esperado || modulo.justificacion)
        .filter(Boolean),
      entregables: [
        "Sistema web operativo con los módulos priorizados",
        "Usuarios, permisos y estados de trabajo definidos",
        "Capacitación inicial y acompañamiento de puesta en marcha"
      ],
      fuera_de_alcance: [
        "Integraciones o funcionalidades no detalladas en los módulos aprobados",
        "Carga histórica que requiera limpieza o transformación extraordinaria"
      ],
      criterios_exito: [
        "Los usuarios clave pueden completar los flujos priorizados sin depender de planillas paralelas",
        "La dirección puede consultar el estado de la operación desde una vista central"
      ],
      roadmap_implementacion: [
        {
          etapa: "Relevamiento y diseño funcional",
          descripcion: "Aterrizar el flujo real, roles, pantallas y prioridades del sistema.",
          duracion_estimada: "1 semana",
          subtareas: [
            "Relevar flujos actuales con responsables",
            "Definir entidades, permisos y pantallas críticas",
            "Cerrar alcance funcional antes de construir"
          ],
          entregables: ["Mapa funcional validado", "Alcance priorizado", "Criterios de aceptación iniciales"],
          criterio_aceptacion: "El cliente valida por escrito el alcance, los roles y el orden de implementación.",
          responsable_cliente: "Disponibilizar usuarios clave y validar los flujos relevados."
        },
        {
          etapa: "Construcción del MVP operativo",
          descripcion: "Desarrollar los módulos principales y validar el uso con datos reales.",
          duracion_estimada: "3 a 5 semanas",
          subtareas: [
            "Construir módulos priorizados",
            "Conectar registros, estados y tableros",
            "Probar con casos reales de la operación"
          ],
          entregables: ["Módulos priorizados funcionando", "Flujos de estados", "Primera versión de métricas"],
          criterio_aceptacion: "Los usuarios clave completan casos reales y se registran los ajustes pendientes.",
          responsable_cliente: "Probar casos reales, aportar feedback y designar un referente por área."
        },
        {
          etapa: "Implementación y ajustes",
          descripcion: "Capacitar al equipo, ajustar fricciones y dejar el sistema listo para operar.",
          duracion_estimada: "1 a 2 semanas",
          subtareas: [
            "Capacitar usuarios clave",
            "Ajustar fricciones detectadas en uso real",
            "Dejar tablero de seguimiento y próximos pasos"
          ],
          entregables: ["Usuarios capacitados", "Datos iniciales cargados", "Sistema listo para operación"],
          criterio_aceptacion: "El equipo ejecuta el flujo acordado y cuenta con un canal de soporte definido.",
          responsable_cliente: "Coordinar la adopción interna y confirmar el cierre de la etapa."
        }
      ],
      supuestos: ["El alcance final se confirma en una reunión de cierre antes de iniciar el desarrollo."],
      proximos_pasos: ["Revisar la propuesta", "Priorizar módulos", "Cerrar alcance, inversión y fecha de inicio"],
      condiciones_operativas: {
        propiedad_sistema: "El sistema desarrollado para el cliente queda destinado a su operación; los alcances de licencia, código y hosting se detallan en el acuerdo final.",
        soporte_mantenimiento: "El mantenimiento mensual cubre continuidad operativa, correcciones y ajustes menores dentro del alcance acordado.",
        cambios_alcance: "Nuevos módulos o cambios que alteren el alcance se estiman y aprueban por separado antes de construirse.",
        datos_y_migracion: "La migración inicial se limita a datos disponibles y utilizables; la limpieza extraordinaria se estima aparte si fuera necesaria."
      }
    };
  }

  const beneficios = parseStringArray(value.beneficios_esperados);
  const entregables = parseStringArray(value.entregables);
  const fueraDeAlcance = parseStringArray(value.fuera_de_alcance);
  const criteriosExito = parseStringArray(value.criterios_exito);

  return {
    vision_sistema:
      typeof value.vision_sistema === "string"
        ? value.vision_sistema
        : "Construir un sistema operativo propio para centralizar la información crítica y ordenar el trabajo diario.",
    alcance_general:
      typeof value.alcance_general === "string"
        ? value.alcance_general
        : "El alcance inicial se organiza alrededor de los módulos sugeridos en esta propuesta.",
    modelo_operativo:
      typeof value.modelo_operativo === "string"
        ? value.modelo_operativo
        : "Blyndtek implementa el sistema por fases, validando cada flujo con usuarios clave antes de avanzar.",
    beneficios_esperados: beneficios.length > 0 ? beneficios : modulos.map((modulo) => modulo.impacto_esperado || modulo.justificacion).filter(Boolean),
    entregables: entregables.length > 0 ? entregables : [
      "Sistema web operativo con los módulos priorizados",
      "Usuarios, permisos y estados de trabajo definidos",
      "Capacitación inicial y acompañamiento de puesta en marcha"
    ],
    fuera_de_alcance: fueraDeAlcance.length > 0 ? fueraDeAlcance : [
      "Integraciones o funcionalidades no detalladas en los módulos aprobados",
      "Carga histórica que requiera limpieza o transformación extraordinaria"
    ],
    criterios_exito: criteriosExito.length > 0 ? criteriosExito : [
      "Los usuarios clave pueden completar los flujos priorizados sin depender de planillas paralelas",
      "La dirección puede consultar el estado de la operación desde una vista central"
    ],
    roadmap_implementacion: Array.isArray(value.roadmap_implementacion)
      ? value.roadmap_implementacion.flatMap((item) => {
          if (!isRecord(item)) {
            return [];
          }

          const etapa = typeof item.etapa === "string" ? item.etapa : "";
          const descripcion = typeof item.descripcion === "string" ? item.descripcion : "";
          const duracion = typeof item.duracion_estimada === "string" ? item.duracion_estimada : "";
          const subtareas = parseStringArray(item.subtareas);
          const entregables = parseStringArray(item.entregables);
          const criterioAceptacion = typeof item.criterio_aceptacion === "string" ? item.criterio_aceptacion : "A validar con el cliente.";
          const responsableCliente = typeof item.responsable_cliente === "string" ? item.responsable_cliente : "Participar en la validación de la etapa.";

          return etapa && descripcion
            ? [{ etapa, descripcion, duracion_estimada: duracion || "A definir", subtareas, entregables, criterio_aceptacion: criterioAceptacion, responsable_cliente: responsableCliente }]
            : [];
        })
      : [],
    supuestos: parseStringArray(value.supuestos),
    proximos_pasos: parseStringArray(value.proximos_pasos),
    condiciones_operativas: {
      propiedad_sistema: isRecord(value.condiciones_operativas) && typeof value.condiciones_operativas.propiedad_sistema === "string"
        ? value.condiciones_operativas.propiedad_sistema
        : "El sistema se destina a la operación del cliente y sus condiciones finales quedan establecidas en el acuerdo.",
      soporte_mantenimiento: isRecord(value.condiciones_operativas) && typeof value.condiciones_operativas.soporte_mantenimiento === "string"
        ? value.condiciones_operativas.soporte_mantenimiento
        : "El mantenimiento mensual cubre continuidad operativa, correcciones y ajustes menores dentro del alcance.",
      cambios_alcance: isRecord(value.condiciones_operativas) && typeof value.condiciones_operativas.cambios_alcance === "string"
        ? value.condiciones_operativas.cambios_alcance
        : "Los cambios de alcance se estiman y aprueban por separado.",
      datos_y_migracion: isRecord(value.condiciones_operativas) && typeof value.condiciones_operativas.datos_y_migracion === "string"
        ? value.condiciones_operativas.datos_y_migracion
        : "La migración se limita a datos disponibles y utilizables, según lo acordado."
    }
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

export function parseAntesDespues(value: unknown, hallazgos: HallazgoInforme[], respuestas?: Record<string, string> | null): AntesDespuesMetrica[] {
  const parsed = Array.isArray(value)
    ? value.flatMap((item) => {
        if (!isRecord(item)) {
          return [];
        }

        const area = typeof item.area === "string" ? item.area.trim() : "";
        const antes = typeof item.antes === "string" ? item.antes.trim() : "";
        const despues = typeof item.despues === "string" ? item.despues.trim() : "";
        const metrica = typeof item.metrica === "string" ? item.metrica.trim() : "";

        return area && antes && despues && metrica
          ? [{
              area,
              antes: safeVisibleText(antes, "El proceso depende de registros distribuidos y seguimiento manual.", respuestas),
              despues: safeVisibleText(despues, "El proceso queda centralizado, visible y delegable.", respuestas),
              metrica: safeVisibleText(metrica, "Menos reproceso y mayor trazabilidad; tiempos exactos a validar en la implementación.", respuestas)
            }]
          : [];
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

export function parseMapaAreas(value: unknown, hallazgos: HallazgoInforme[], respuestas?: Record<string, string> | null): AreaHeatmap[] {
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
    const levels = new Set(parsed.map((item) => item.nivel));
    const contextualBase = Object.values(respuestas ?? {}).filter((value) => value.trim().length > 0).length >= 4 ? 3 : 2;
    return parsed.slice(0, 8).map((item, index) => ({
      ...item,
      nivel: levels.size === 1 ? Math.min(5, Math.max(1, contextualBase + (index % 3))) : item.nivel
    }));
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
      "id, token_publico, respuestas, informe_hallazgos, modulos_sugeridos, precio_ideal_desarrollo, precio_ideal_mensual, estado, created_at, lead:leads(empresa, contacto_1_nombre)"
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
    isRecord(data.informe_hallazgos) ? data.informe_hallazgos.hallazgos : data.informe_hallazgos,
    data.respuestas
  );
  const modulos = parseModulos(
    isRecord(data.modulos_sugeridos) ? data.modulos_sugeridos.modulos : data.modulos_sugeridos
  );
  const informeHallazgos = isRecord(data.informe_hallazgos) ? data.informe_hallazgos : null;
  const cuantificacionRecord = informeHallazgos && isRecord(informeHallazgos.cuantificacion)
    ? informeHallazgos.cuantificacion
    : null;
  const cuantificacion = cuantificacionRecord
    ? {
        total_mensual_usd: Number(cuantificacionRecord.total_mensual_usd ?? 0),
        total_anual_usd: Number(cuantificacionRecord.total_anual_usd ?? 0),
        metricas_con_datos: Number(cuantificacionRecord.metricas_con_datos ?? 0),
        confianza: ["alta", "media", "baja"].includes(String(cuantificacionRecord.confianza))
          ? (String(cuantificacionRecord.confianza) as "alta" | "media" | "baja")
          : "media"
      }
    : null;

  return {
    record: data,
    empresa: data.lead?.empresa ?? "tu operación",
    contacto: data.lead?.contacto_1_nombre ?? null,
    hallazgos,
    modulos,
    diagnosticoEmpresa: parseDiagnosticoEmpresa(
      informeHallazgos ? informeHallazgos.diagnostico_empresa : null,
      hallazgos,
      data.respuestas
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
    antesDespues: parseAntesDespues(informeHallazgos ? informeHallazgos.antes_despues : null, hallazgos, data.respuestas),
    mapaAreas: parseMapaAreas(informeHallazgos ? informeHallazgos.mapa_areas : null, hallazgos, data.respuestas),
    cuantificacion,
    precio_ideal_desarrollo: Number(data.precio_ideal_desarrollo ?? 0),
    precio_ideal_mensual: Number(data.precio_ideal_mensual ?? 0)
  };
}
