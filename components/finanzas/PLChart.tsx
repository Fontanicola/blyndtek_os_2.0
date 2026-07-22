"use client";

import { useId, useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import { Card } from "@/components/ui";
import {
  chartTheme,
  formatCompactCurrencyTick,
  getChartActiveDot,
  getChartDot,
  getChartGradientFill,
  getConservativeCurveType,
  renderChartGradient
} from "@/lib/charts/chartTheme";
import { formatUSD } from "@/lib/utils/formatters";
import type { MonthlyFinancialPoint } from "@/lib/finanzas";

type PLChartProps = {
  data: MonthlyFinancialPoint[];
};

export function PLChart({ data }: PLChartProps) {
  const ingresosGradientId = useId();
  const egresosGradientId = useId();
  const averageMargin = useMemo(() => {
    const totalIngresos = data.reduce((total, point) => total + point.ingresos, 0);
    const totalEgresos = data.reduce((total, point) => total + point.egresos, 0);

    if (totalIngresos <= 0) {
      return null;
    }

    return ((totalIngresos - totalEgresos) / totalIngresos) * 100;
  }, [data]);
  const incomeCurveType = useMemo(() => getConservativeCurveType(data.map((point) => point.ingresos)), [data]);
  const expenseCurveType = useMemo(() => getConservativeCurveType(data.map((point) => point.egresos)), [data]);
  const marginCurveType = useMemo(() => getConservativeCurveType(data.map((point) => point.margen)), [data]);
  const lowestMarginPoint = useMemo(() => {
    if (data.length === 0) {
      return null;
    }

    return data.reduce((lowest, point) => (point.margen < lowest.margen ? point : lowest), data[0]!);
  }, [data]);
  const minUsdSeriesValue = useMemo(() => {
    if (data.length === 0) {
      return 0;
    }

    return data.reduce(
      (min, point) => Math.min(min, point.ingresos, point.egresos, point.margen),
      Number.POSITIVE_INFINITY
    );
  }, [data]);
  return (
    <Card
      padding="md"
      className="overflow-hidden bg-white [&_svg_text[text-anchor='start']]:hidden"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-title text-carbon">P&amp;L mensual</h3>
            <p className="text-sm text-graphite">Ingresos vs egresos de los ultimos 12 meses.</p>
            <p className="mt-1 text-xs font-base text-graphite">
              Margen promedio (12 meses): {averageMargin == null ? "Sin datos" : `${averageMargin.toFixed(1)}%`}
            </p>
            {lowestMarginPoint && lowestMarginPoint.margen < 0 ? (
              <p className="mt-2 inline-flex items-center gap-2 rounded-pill border border-danger/20 bg-danger/5 px-2.5 py-1 text-[11px] font-label text-danger">
                Margen negativo más bajo: {lowestMarginPoint.label} · {formatUSD(lowestMarginPoint.margen)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: "Ingresos", color: chartTheme.colors.signal },
              { label: "Egresos", color: chartTheme.colors.danger },
              { label: "Margen", color: chartTheme.colors.success }
            ].map((item) => (
              <span key={item.label} className={chartTheme.legend.pillClassName}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="w-full">
          <ResponsiveContainer width="100%" height={420}>
            <ComposedChart data={data} margin={{ top: 24, right: 28, left: 14, bottom: 14 }}>
              <defs>
                {renderChartGradient(ingresosGradientId, "signal")}
                {renderChartGradient(egresosGradientId, "danger")}
              </defs>
              <CartesianGrid
                strokeDasharray={chartTheme.grid.strokeDasharray}
                stroke={chartTheme.grid.stroke}
                vertical={chartTheme.grid.vertical}
              />
              <XAxis
                dataKey="label"
                tick={chartTheme.axis.tick}
                axisLine={chartTheme.axis.axisLine}
                tickLine={chartTheme.axis.tickLine}
                tickMargin={chartTheme.axis.tickMargin}
                interval={0}
              />
              <YAxis
                tickFormatter={formatCompactCurrencyTick}
                tick={chartTheme.axis.tick}
                axisLine={chartTheme.axis.axisLine}
                tickLine={chartTheme.axis.tickLine}
                tickMargin={chartTheme.axis.tickMargin}
                domain={[minUsdSeriesValue < 0 ? Math.floor(minUsdSeriesValue) : 0, "auto"]}
              />
              <Tooltip
                cursor={{ stroke: chartTheme.colors.line, strokeWidth: 1, strokeDasharray: "3 6" }}
                content={({ active, payload, label }: TooltipContentProps<number, string>) => {
                  const point = payload?.[0]?.payload as MonthlyFinancialPoint | undefined;

                  if (!active || !point) {
                    return null;
                  }

                  return (
                    <div className={chartTheme.tooltip.className}>
                      <p className={chartTheme.tooltip.titleClassName}>{label}</p>
                      <div className={chartTheme.tooltip.bodyClassName}>
                        <div className={chartTheme.tooltip.rowClassName}>
                          <span className={chartTheme.tooltip.labelClassName} style={{ color: chartTheme.colors.signal }}>
                            Ingresos
                          </span>
                          <span className={chartTheme.tooltip.valueClassName}>{formatUSD(point.ingresos)}</span>
                        </div>
                        <div className={chartTheme.tooltip.rowClassName}>
                          <span className={chartTheme.tooltip.labelClassName} style={{ color: chartTheme.colors.danger }}>
                            Egresos
                          </span>
                          <span className={chartTheme.tooltip.valueClassName}>{formatUSD(point.egresos)}</span>
                        </div>
                        <div className={chartTheme.tooltip.rowClassName}>
                          <span className={chartTheme.tooltip.labelClassName} style={{ color: chartTheme.colors.success }}>
                            Margen
                          </span>
                          <span className={chartTheme.tooltip.valueClassName}>{formatUSD(point.margen)}</span>
                        </div>
                        <div className={chartTheme.tooltip.rowClassName}>
                          <span className={chartTheme.tooltip.labelClassName}>Clientes activos</span>
                          <span className={chartTheme.tooltip.valueClassName}>
                            {point.clientes_activos.toLocaleString("en-US")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                dataKey="ingresos"
                name="Ingresos"
                stroke={chartTheme.colors.signal}
                strokeWidth={chartTheme.area.strokeWidth}
                fill={getChartGradientFill(ingresosGradientId)}
                dot={getChartDot(chartTheme.colors.signal)}
                activeDot={getChartActiveDot(chartTheme.colors.signal)}
                type={incomeCurveType}
              />
              <Area
                dataKey="egresos"
                name="Egresos"
                stroke={chartTheme.colors.danger}
                strokeWidth={chartTheme.area.strokeWidth}
                fill={getChartGradientFill(egresosGradientId)}
                dot={getChartDot(chartTheme.colors.danger)}
                activeDot={getChartActiveDot(chartTheme.colors.danger)}
                type={expenseCurveType}
              />
              <Line
                dataKey="margen"
                name="Margen"
                stroke={chartTheme.colors.success}
                strokeWidth={chartTheme.line.strokeWidth}
                dot={getChartDot(chartTheme.colors.success)}
                activeDot={getChartActiveDot(chartTheme.colors.success)}
                type={marginCurveType}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
