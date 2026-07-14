"use client";

import { useMemo, useRef, useState, type MouseEvent } from "react";
import { Card } from "@/components/ui";
import { formatUSD } from "@/lib/utils/formatters";
import type { CarteraClienteItem } from "@/types/finanzas";

type CarteraClientesChartProps = {
  data: CarteraClienteItem[];
};

const HEX_SUCCESS = "#38A169";
const HEX_WARNING = "#D97706";
const TRACK = "#F0F2F7";

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

                    <div className="relative h-3 overflow-hidden rounded-pill" style={{ backgroundColor: TRACK }}>
                      <div
                        className="absolute inset-y-0 left-0 overflow-hidden rounded-pill"
                        style={{ width: `${totalWidth}%` }}
                      >
                        <div className="flex h-full w-full">
                          <div
                            className="h-full"
                            style={{
                              width: `${totalWidth > 0 ? (cobradoWidth / totalWidth) * 100 : 0}%`,
                              backgroundColor: HEX_SUCCESS
                            }}
                          />
                          <div
                            className="h-full"
                            style={{
                              width: `${totalWidth > 0 ? (pendienteWidth / totalWidth) * 100 : 0}%`,
                              backgroundColor: HEX_WARNING
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
                className="pointer-events-none absolute z-10 w-64 rounded-card border border-[#EAECF0] bg-white p-3 text-sm shadow-modal"
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
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: HEX_SUCCESS }} />
              Cobrado
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: HEX_WARNING }} />
              Pendiente
            </span>
          </div>
        </>
      ) : (
        <div className="rounded-card border border-line-soft bg-paper px-4 py-8 text-sm text-graphite">
          Todavía no hay contratos de desarrollo registrados.
        </div>
      )}
    </Card>
  );
}
