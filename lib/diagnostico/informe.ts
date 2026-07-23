import { createAdminClient } from "@/lib/supabase/admin";

export type HallazgoInforme = {
  hallazgo: string;
  impacto: string;
  que_resolveria: string;
};

export type ModuloInforme = {
  nombre: string;
  descripcion: string | null;
  categoria?: string | null;
  justificacion: string;
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
  precio_ideal_desarrollo: number;
  precio_ideal_mensual: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

    if (!hallazgo || !impacto || !queResolveria) {
      return [];
    }

    return [{ hallazgo, impacto, que_resolveria: queResolveria }];
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

    if (!nombre) {
      return [];
    }

    return [{ nombre, descripcion, categoria, justificacion }];
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

  return {
    record: data,
    empresa: data.lead?.empresa ?? "tu operación",
    contacto: data.lead?.contacto_1_nombre ?? null,
    hallazgos: parseHallazgos(data.informe_hallazgos),
    modulos: parseModulos(data.modulos_sugeridos),
    precio_ideal_desarrollo: Number(data.precio_ideal_desarrollo ?? 0),
    precio_ideal_mensual: Number(data.precio_ideal_mensual ?? 0)
  };
}
