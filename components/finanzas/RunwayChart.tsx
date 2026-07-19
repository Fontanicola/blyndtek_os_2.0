"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import { Card } from "@/components/ui";
import { AlertTriangleIcon } from "@/components/ui/icons";
import { chartTheme, formatCompactCurrencyTick } from "@/lib/charts/chartTheme";
import { formatUSD } from "@/lib/utils/formatters";
import type { RunwayProjectionMonth } from "@/lib/finanzas/runwayProjection";

type RunwayChartDatum = RunwayProjectionMonth & {
  caja_cero: number;
  agotamiento_actual: number | null;
  agotamiento_escenario: number | null;
};

type ChartRenderDatum = {
  month: string;
  label: string;
  ingresos: number;
  costos_fijos: number;
  costos_hipotesis: number;
  costos_totales: number;
  margen_usd: number;
  margen_pct: number;
  caja_acumulada_actual: number;
  caja_acumulada_escenario: number;
  caja_cero: number;
  agotamiento_actual: number | null;
  agotamiento_escenario: number | null;
  agotamiento_label_actual: string | null;
  agotamiento_label_escenario: string | null;
  detalles_hipotesis_json: string;
};

type RunwayChartProps = {
  data: RunwayChartDatum[];
  hasScenario: boolean;
  mesAgotamientoActual: string | null;
  mesAgotamientoEscenario: string | null;
};

function getScenarioStroke(data: ChartRenderDatum[]) {
  const lastPoint = data[data.length - 1];
  if (!lastPoint) {
    return chartTheme.colors.warning;
  }

  return lastPoint.caja_acumulada_escenario >= lastPoint.caja_acumulada_actual
    ? chartTheme.colors.success
    : chartTheme.colors.danger;
}

function getExhaustionPoint(data: ChartRenderDatum[], monthLabel: string | null, key: "caja_acumulada_actual" | "caja_acumulada_escenario") {
  if (!monthLabel) {
    return null;
  }

  return data.find((point) => point.label === monthLabel && point[key] < 0) ?? null;
}

function toChartRenderDatum(row: RunwayChartDatum): ChartRenderDatum {
  return {
    month: row.month,
    label: row.label,
    ingresos: row.ingresos,
    costos_fijos: row.costos_fijos,
    costos_hipotesis: row.costos_hipotesis,
    costos_totales: row.costos_totales,
    margen_usd: row.margen_usd,
    margen_pct: row.margen_pct,
    caja_acumulada_actual: row.caja_acumulada_actual,
    caja_acumulada_escenario: row.caja_acumulada_escenario,
    caja_cero: row.caja_cero,
    agotamiento_actual: row.agotamiento_actual,
    agotamiento_escenario: row.agotamiento_escenario,
    agotamiento_label_actual: row.agotamiento_actual == null ? null : `Caja se agota: ${row.label}`,
    agotamiento_label_escenario: row.agotamiento_escenario == null ? null : `Caja se agota: ${row.label}`,
    detalles_hipotesis_json: JSON.stringify(row.costos_hipotesis_detalle)
  };
}

function parseHypothesisDetails(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is { nombre: string; monto: number } =>
        typeof item === "object" &&
        item != null &&
        "nombre" in item &&
        "monto" in item &&
        typeof item.nombre === "string" &&
        typeof item.monto === "number"
    );
  } catch {
    return [];
  }
}

export function RunwayChart({
  data,
  hasScenario,
  mesAgotamientoActual,
  mesAgotamientoEscenario
}: RunwayChartProps) {
  const chartData = useMemo(() => data.map(toChartRenderDatum), [data]);
  const scenarioStroke = useMemo(() => getScenarioStroke(chartData), [chartData]);
  const actualExhaustion = useMemo(
    () => getExhaustionPoint(chartData, mesAgotamientoActual, "caja_acumulada_actual"),
    [chartData, mesAgotamientoActual]
  );
  const scenarioExhaustion = useMemo(
    () => getExhaustionPoint(chartData, mesAgotamientoEscenario, "caja_acumulada_escenario"),
    [chartData, mesAgotamientoEscenario]
  );

  return (
    <Card padding="md" className="space-y-5 overflow-hidden bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-title text-carbon">Flujo y caja proyectada</h3>
          <p className="text-sm text-graphite">
            Barras de ingresos y costos mensuales, con la caja acumulada encima para ver el agotamiento de un vistazo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-graphite">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
            Ingresos
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-danger" />
            Costos
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-signal" />
            Caja actual
          </span>
          {hasScenario ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: scenarioStroke }} />
              Escenario
            </span>
          ) : null}
        </div>
      </div>

      <div className="h-[430px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 28, right: 28, bottom: 12, left: 4 }}>
            <CartesianGrid
              stroke={chartTheme.grid.stroke}
              strokeDasharray={chartTheme.grid.strokeDasharray}
              vertical={chartTheme.grid.vertical}
            />
            <XAxis
              dataKey="label"
              tick={chartTheme.axis.tick}
              axisLine={chartTheme.axis.axisLine}
              tickLine={chartTheme.axis.tickLine}
            />
            <YAxis
              yAxisId="flow"
              tick={chartTheme.axis.tick}
              tickFormatter={formatCompactCurrencyTick}
              domain={[0, "dataMax"]}
              axisLine={chartTheme.axis.axisLine}
              tickLine={chartTheme.axis.tickLine}
            />
            <YAxis
              yAxisId="cash"
              orientation="right"
              tick={chartTheme.axis.tick}
              tickFormatter={formatCompactCurrencyTick}
              axisLine={chartTheme.axis.axisLine}
              tickLine={chartTheme.axis.tickLine}
            />
            <Tooltip
              cursor={{ fill: "rgba(31, 68, 255, 0.04)" }}
              content={({ active, payload, label }: TooltipContentProps<number, string>) => {
                if (!active || !payload?.length) {
                  return null;
                }

                const row = payload[0]?.payload as ChartRenderDatum | undefined;
                if (!row) {
                  return null;
                }

                const hypothesisDetails = parseHypothesisDetails(row.detalles_hipotesis_json);

                return (
                  <div className={`min-w-[250px] ${chartTheme.tooltip.className}`}>
                    <p className="mb-3 font-label text-carbon">{label}</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-4 text-success">
                        <span>Ingresos</span>
                        <span className="font-label">{formatUSD(row.ingresos)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-danger">
                        <span>Costos fijos</span>
                        <span className="font-label">{formatUSD(row.costos_fijos)}</span>
                      </div>
                      {hypothesisDetails.length > 0 ? (
                        <div className="space-y-1 border-t border-line-soft pt-2 text-warning">
                          {hypothesisDetails.map((detail) => (
                            <div key={`${row.month}-${detail.nombre}`} className="flex items-center justify-between gap-4">
                              <span className="max-w-[150px] truncate">{detail.nombre}</span>
                              <span className="font-label">{formatUSD(detail.monto)}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {row.costos_hipotesis > 0 ? (
                        <div className="flex items-center justify-between gap-4 text-warning">
                          <span>Costos de hipótesis</span>
                          <span className="font-label">{formatUSD(row.costos_hipotesis)}</span>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between gap-4 border-t border-line-soft pt-2 text-carbon">
                        <span>Margen</span>
                        <span className="font-label">{formatUSD(row.margen_usd)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-signal">
                        <span>Caja acumulada actual</span>
                        <span className="font-label">{formatUSD(row.caja_acumulada_actual)}</span>
                      </div>
                      {hasScenario ? (
                        <div className="flex items-center justify-between gap-4" style={{ color: scenarioStroke }}>
                          <span>Caja con escenario</span>
                          <span className="font-label">{formatUSD(row.caja_acumulada_escenario)}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              yAxisId="flow"
              dataKey="ingresos"
              name="Ingresos"
              fill={chartTheme.colors.success}
              radius={chartTheme.bar.radius}
              barSize={chartTheme.bar.barSize}
            />
            <Bar
              yAxisId="flow"
              dataKey="costos_totales"
              name="Costos"
              fill={chartTheme.colors.danger}
              radius={chartTheme.bar.radius}
              barSize={chartTheme.bar.barSize}
            />
            <Line
              yAxisId="cash"
              dataKey="caja_cero"
              name="Sin caja"
              stroke={chartTheme.colors.graphite}
              strokeOpacity={0.45}
              strokeWidth={1}
              strokeDasharray="4 6"
              dot={false}
              activeDot={false}
              type="linear"
              isAnimationActive={false}
            />
            <Line
              yAxisId="cash"
              dataKey="caja_acumulada_actual"
              name="Caja actual"
              stroke={chartTheme.colors.signal}
              strokeWidth={2}
              dot={{ r: 3.5, fill: "#FFFFFF", stroke: chartTheme.colors.signal, strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: "#FFFFFF", stroke: chartTheme.colors.signal, strokeWidth: 2 }}
              type="monotone"
            />
            {hasScenario ? (
              <Line
                yAxisId="cash"
                dataKey="caja_acumulada_escenario"
                name="Caja con escenario"
                stroke={scenarioStroke}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3.5, fill: "#FFFFFF", stroke: scenarioStroke, strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: "#FFFFFF", stroke: scenarioStroke, strokeWidth: 2 }}
                type="monotone"
              />
            ) : null}
            <Line
              yAxisId="cash"
              dataKey="agotamiento_actual"
              name={actualExhaustion ? `Caja se agota: ${actualExhaustion.label}` : "Agotamiento actual"}
              stroke="transparent"
              strokeWidth={0}
              dot={{ r: 5, fill: chartTheme.colors.danger, stroke: "#FFFFFF", strokeWidth: 2 }}
              label={{ dataKey: "agotamiento_label_actual", position: "top", fill: chartTheme.colors.danger, fontSize: 11 }}
              activeDot={false}
              type="linear"
              isAnimationActive={false}
            />
            {hasScenario ? (
              <Line
                yAxisId="cash"
                dataKey="agotamiento_escenario"
                name={scenarioExhaustion ? `Caja se agota: ${scenarioExhaustion.label}` : "Agotamiento escenario"}
                stroke="transparent"
                strokeWidth={0}
                dot={{ r: 5, fill: scenarioStroke, stroke: "#FFFFFF", strokeWidth: 2 }}
                label={{ dataKey: "agotamiento_label_escenario", position: "bottom", fill: scenarioStroke, fontSize: 11 }}
                activeDot={false}
                type="linear"
                isAnimationActive={false}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {actualExhaustion || scenarioExhaustion ? (
        <div className="inline-flex items-center gap-2 rounded-component border border-danger/20 bg-danger-light px-3 py-2 text-xs font-label text-danger">
          <AlertTriangleIcon className="h-4 w-4" />
          Revisá el primer mes de agotamiento marcado en el gráfico.
        </div>
      ) : null}
    </Card>
  );
}
