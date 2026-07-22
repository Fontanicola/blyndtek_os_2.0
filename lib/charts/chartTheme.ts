export const chartTheme = {
  colors: {
    signal: "#1F44FF",
    success: "#38A169",
    danger: "#E53E3E",
    warning: "#D97706",
    graphite: "#5A6373",
    carbon: "#0B0E14",
    muted: "#98A2B3",
    line: "#E7ECF3",
    paper: "#F6F8FB"
  },
  grid: {
    stroke: "#E7ECF3",
    strokeDasharray: "4 6",
    vertical: false
  },
  axis: {
    tick: { fontSize: 10, fill: "#667085" },
    axisLine: false,
    tickLine: false,
    tickMargin: 8
  },
  legend: {
    wrapperStyle: { fontSize: 11, color: "#5A6373" },
    pillClassName:
      "inline-flex items-center gap-2 rounded-pill border border-line-soft bg-white px-2.5 py-1 text-[11px] font-label tracking-[0.01em] text-graphite",
    subtlePillClassName:
      "inline-flex items-center gap-2 rounded-pill border border-line-soft bg-paper px-2.5 py-1 text-[11px] font-label tracking-[0.01em] text-graphite"
  },
  tooltip: {
    className:
      "rounded-card border border-line-soft bg-white/95 px-3.5 py-3 text-sm shadow-modal backdrop-blur-[6px]",
    titleClassName: "font-title text-[13px] leading-none text-carbon",
    bodyClassName: "mt-3 space-y-2",
    rowClassName: "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 text-[12px] leading-tight",
    labelClassName: "font-base text-graphite",
    valueClassName: "font-label tabular-nums text-carbon",
    metaClassName: "text-[11px] leading-tight text-graphite"
  },
  bar: {
    barSize: 14,
    radius: [3, 3, 0, 0] as [number, number, number, number],
    horizontalRadius: [0, 3, 3, 0] as [number, number, number, number]
  },
  line: {
    strokeWidth: 1.9,
    type: "linear" as const,
    activeDotRadius: 4,
    activeDotStrokeWidth: 1.75
  },
  area: {
    strokeWidth: 1.9,
    type: "linear" as const,
    fillOpacity: 0.1
  },
  sparkline: {
    strokeWidth: 1.75,
    type: "linear" as const,
    xTick: { fontSize: 9, fill: "#667085" }
  },
  secondarySeries: {
    stroke: "#98A2B3",
    fill: "#DCE3EE",
    strokeDasharray: "4 6",
    strokeOpacity: 0.95
  }
};

export function getChartActiveDot(color: string) {
  return {
    r: chartTheme.line.activeDotRadius,
    fill: "#FFFFFF",
    stroke: color,
    strokeWidth: chartTheme.line.activeDotStrokeWidth
  };
}

export function getConservativeCurveType(values: Array<number | null | undefined>) {
  type ConservativeCurveType = "linear" | "monotoneX";
  let consecutiveActivePoints = 0;
  let maxConsecutiveActivePoints = 0;

  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && Math.abs(value) > 0) {
      consecutiveActivePoints += 1;
      maxConsecutiveActivePoints = Math.max(maxConsecutiveActivePoints, consecutiveActivePoints);
    } else {
      consecutiveActivePoints = 0;
    }
  }

  const curveType: ConservativeCurveType = maxConsecutiveActivePoints >= 4 ? "monotoneX" : "linear";
  return curveType;
}

export function formatCompactCurrencyTick(value: number | string) {
  const numericValue = Number(value);
  const absolute = Math.abs(numericValue);
  const sign = numericValue < 0 ? "-" : "";

  if (absolute >= 1000) {
    const compact = absolute / 1000;
    const digits = compact >= 100 ? 0 : 1;
    return `${sign}$${compact.toFixed(digits)}k`;
  }

  return `${sign}$${Math.round(absolute).toLocaleString("en-US")}`;
}
