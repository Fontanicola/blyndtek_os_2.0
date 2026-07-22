"use client";

import { useId, useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import { Card } from "@/components/ui";
import {
  chartTheme,
  formatCompactCurrencyTick,
  getAreaCurveType,
  getChartActiveDot,
  getChartDot,
  getChartGradientFill,
  renderChartGradient
} from "@/lib/charts/chartTheme";
import { formatUSD } from "@/lib/utils/formatters";
import type { MonthlyFinancialPoint } from "@/lib/finanzas";

type PLChartProps = {
  data: MonthlyFinancialPoint[];
};

type PLChartVisualPoint = MonthlyFinancialPoint & {
  paddingPoint?: number;
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
  const chartData = useMemo<PLChartVisualPoint[]>(() => {
    if (data.length === 0) {
      return [];
    }

    const first = data[0]!;
    const last = data[data.length - 1]!;
    const startPadding: PLChartVisualPoint = {
      ...first,
      label: "",
      ingresos: 0,
      egresos: 0,
      paddingPoint: 1
    };
    const endPadding: PLChartVisualPoint = {
      ...last,
      label: "",
      ingresos: 0,
      egresos: 0,
      paddingPoint: 1
    };

    return [startPadding, ...data, endPadding];
  }, [data]);
  const incomeCurveType = useMemo(() => getAreaCurveType(chartData.map((point) => point.ingresos)), [chartData]);
  const expenseCurveType = useMemo(() => getAreaCurveType(chartData.map((point) => point.egresos)), [chartData]);
  const minUsdSeriesValue = useMemo(() => {
    if (data.length === 0) {
      return 0;
    }

    return data.reduce(
      (min, point) => Math.min(min, point.ingresos, point.egresos),
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
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: "Ingresos", color: chartTheme.colors.signal },
              { label: "Egresos", color: chartTheme.colors.danger }
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
            <ComposedChart data={chartData} margin={{ top: 24, right: 28, left: 14, bottom: 14 }}>
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
                  const point = payload?.[0]?.payload as PLChartVisualPoint | undefined;

                  if (!active || !point || point.paddingPoint) {
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
                isAnimationActive={false}
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
                isAnimationActive={false}
                type={expenseCurveType}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
