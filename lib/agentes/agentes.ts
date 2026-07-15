import type { Json } from "@/types/supabase";
import type { AgenteConfig, AgenteConfigKey, AgenteConfigRow } from "@/types/agentes";

export const AGENTE_ASESOR_FINANCIERO_SLUG = "asesor-financiero";

export const DEFAULT_AGENTE_CONFIG: AgenteConfig = {
  runway_objetivo_meses: 6,
  resumen_automatico_activo: false,
  frecuencia_resumen: "mensual"
};

const CONFIG_KEY_ORDER: AgenteConfigKey[] = [
  "runway_objetivo_meses",
  "resumen_automatico_activo",
  "frecuencia_resumen"
];

export function normalizeAgenteConfig(rows: AgenteConfigRow[] | null | undefined): AgenteConfig {
  const config: AgenteConfig = { ...DEFAULT_AGENTE_CONFIG };

  for (const key of CONFIG_KEY_ORDER) {
    const row = rows?.find((item) => item.clave === key);

    if (!row) {
      continue;
    }

    if (key === "runway_objetivo_meses") {
      const value = Number(row.valor);
      if (!Number.isNaN(value)) {
        config.runway_objetivo_meses = value;
      }
      continue;
    }

    if (key === "resumen_automatico_activo") {
      if (typeof row.valor === "boolean") {
        config.resumen_automatico_activo = row.valor;
      } else if (typeof row.valor === "string") {
        config.resumen_automatico_activo = row.valor === "true";
      } else if (typeof row.valor === "number") {
        config.resumen_automatico_activo = row.valor !== 0;
      }
      continue;
    }

    if (key === "frecuencia_resumen") {
      config.frecuencia_resumen =
        typeof row.valor === "string" && row.valor.trim().length > 0
          ? row.valor
          : DEFAULT_AGENTE_CONFIG.frecuencia_resumen;
    }
  }

  return config;
}

export function buildAgenteConfigEntries(input: Partial<AgenteConfig>): Array<{ clave: AgenteConfigKey; valor: Json }> {
  const entries: Array<{ clave: AgenteConfigKey; valor: Json }> = [];

  if (typeof input.runway_objetivo_meses === "number" && !Number.isNaN(input.runway_objetivo_meses)) {
    entries.push({ clave: "runway_objetivo_meses", valor: input.runway_objetivo_meses });
  }

  if (typeof input.resumen_automatico_activo === "boolean") {
    entries.push({ clave: "resumen_automatico_activo", valor: input.resumen_automatico_activo });
  }

  if (typeof input.frecuencia_resumen === "string" && input.frecuencia_resumen.trim().length > 0) {
    entries.push({ clave: "frecuencia_resumen", valor: input.frecuencia_resumen.trim() });
  }

  return entries;
}
