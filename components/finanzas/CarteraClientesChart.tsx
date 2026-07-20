"use client";

import { useMemo, useRef, useState, type MouseEvent } from "react";
import { Card, EmptyState } from "@/components/ui";
import { BriefcaseIcon } from "@/components/ui/icons";
import { chartTheme } from "@/lib/charts/chartTheme";
import { formatUSD } from "@/lib/utils/formatters";
import type { CarteraClienteItem } from "@/types/finanzas";

type CarteraClientesChartProps = {
  data: CarteraClienteItem[];
};

function formatMoneyTick(value: number) {
  return `$${value.toLocaleString("en-US")}`;
}

export function CarteraClientesChart({ data }: CarteraClientesChartProps) {
  const chartData = useMemo(
    () =>
      data.map((item, index) => ({
        ...item,
        empresa: item.empresa?.trim() || item.cliente_id || `Cliente ${index + 1}`
      })),
    [data]
  );
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const chartRef = useRef<HTMLDivElement | null>(null);
  const maxTotal = useMemo(
    () => Math.max(1, ...chartData.map((item) => item.total_contrato)),
    [chartData]
  );
  const activeItem = hoveredIndex === null ? null : chartData[hoveredIndex] ?? null;

  const tickValues = useMemo(
    () => [0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round(maxTotal * fraction)),
    [maxTotal]
  );

  function updateTooltipPosition(event: MouseEvent<HTMLDivElement>) {
    const containerRect = chartRef.current?.getBoundingClientRect();
    if (!containerRect) {
      return;
    }

    const x = event.clientX - containerRect.left;
    const y = event.clientY - containerRect.top;

    setTooltipPosition({
      x: Math.max(0, Math.min(containerRect.width - 260, x + 12)),
      y: Math.max(0, Math.min(containerRect.height - 120, y + 12))
    });
  }

  return (
    <Card padding="md" className="space-y-4">
      <div>
        <h3 className="text-base font-title text-carbon">Cartera por cliente</h3>
        <p className="text-sm text-graphite">Contratos de desarrollo a medida — cobrado vs pendiente.</p>
      </div>

      {chartData.length > 0 ? (
        <>
          <div ref={chartRef} className="relative overflow-hidden rounded-card border border-line-soft bg-white px-4 py-5">
            <div className="mb-4 grid grid-cols-[minmax(128px,180px)_minmax(0,1fr)] items-center gap-4">
              <div />
              <div className="flex justify-between text-[10px] font-label text-graphite">
              {tickValues.map((value) => (
                <span key={value}>{formatMoneyTick(value)}</span>
              ))}
              </div>
            </div>

            <div className="space-y-5">
              {chartData.map((item, index) => {
                const total = item.total_cobrado + item.total_pendiente;
                const totalWidth = (total / maxTotal) * 100;
                const cobradoWidth = total > 0 ? totalWidth * (item.total_cobrado / total) : 0;
                const pendienteWidth = total > 0 ? totalWidth * (item.total_pendiente / total) : 0;

                return (
                  <div
                    key={item.cliente_id}
                    className="group grid grid-cols-[minmax(128px,180px)_minmax(0,1fr)] items-center gap-4"
                    onMouseEnter={(event) => {
                      setHoveredIndex(index);
                      updateTooltipPosition(event);
                    }}
                    onMouseMove={updateTooltipPosition}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onFocus={() => setHoveredIndex(index)}
                    onBlur={() => setHoveredIndex(null)}
                    tabIndex={0}
                  >
                    <div className="truncate text-sm font-label text-carbon">{item.empresa}</div>

                    <div className="relative h-3 overflow-hidden rounded-pill" style={{ backgroundColor: chartTheme.colors.paper }}>
                      <div
                        className="absolute inset-y-0 left-0 overflow-hidden rounded-pill"
                        style={{ width: `${totalWidth}%` }}
                      >
                        <div className="flex h-full w-full">
                          <div
                            className="h-full"
                            style={{
                              width: `${totalWidth > 0 ? (cobradoWidth / totalWidth) * 100 : 0}%`,
                              backgroundColor: chartTheme.colors.success
                            }}
                          />
                          <div
                            className="h-full"
                            style={{
                              width: `${totalWidth > 0 ? (pendienteWidth / totalWidth) * 100 : 0}%`,
                              backgroundColor: chartTheme.colors.warning
                            }}
                          />
                        </div>
                      </div>
                      <div className="pointer-events-none absolute inset-0 rounded-pill ring-1 ring-inset ring-carbon/5" />
                    </div>
                  </div>
                );
              })}
            </div>

            {activeItem ? (
              <div
                className={`pointer-events-none absolute z-10 w-64 ${chartTheme.tooltip.className}`}
                style={{ left: `${tooltipPosition.x}px`, top: `${tooltipPosition.y}px` }}
              >
                <p className="mb-1 font-label text-carbon">{activeItem.empresa}</p>
                <p className="text-xs text-success">Cobrado: {formatUSD(activeItem.total_cobrado)}</p>
                <p className="text-xs text-warning">Pendiente: {formatUSD(activeItem.total_pendiente)}</p>
                <p className="mt-1 text-xs text-graphite">
                  Total: {formatUSD(activeItem.total_contrato)} ({activeItem.pct_cobrado.toFixed(0)}% cobrado)
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-graphite">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartTheme.colors.success }} />
              Cobrado
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartTheme.colors.warning }} />
              Pendiente
            </span>
          </div>
        </>
      ) : (
        <EmptyState
          icon={BriefcaseIcon}
          titulo="Todavía no hay contratos de desarrollo registrados"
          descripcion="Cuando existan contratos activos, la cartera por cliente se va a visualizar acá."
        />
      )}
    </Card>
  );
}
