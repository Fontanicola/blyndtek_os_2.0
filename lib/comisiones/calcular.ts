import type { ConfigComisiones } from "@/types/comisiones";

export function calcularComision(
  montoVenta: number,
  config: ConfigComisiones
): { baseComision: number; porcentaje: number; montoComision: number } {
  const baseComision = Math.max(montoVenta, config.piso_base_usd);
  const porcentaje =
    montoVenta >= config.tier_2_umbral_usd ? config.tier_2_pct : config.tier_1_pct;
  const montoComision = baseComision * (porcentaje / 100);

  return {
    baseComision,
    porcentaje,
    montoComision
  };
}
