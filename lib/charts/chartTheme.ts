import React from "react";

export const chartTheme = {
  colors: {
    signal: "#263A6D",
    success: "#3F8F68",
    danger: "#C96B74",
    warning: "#B7791F",
    graphite: "#64748B",
    carbon: "#0F172A",
    muted: "#94A3B8",
    line: "#E2E8F0",
    paper: "#F8FAFC"
  },
  gradients: {
    signal: {
      topOpacity: 0.42,
      middleOpacity: 0.2,
      bottomOpacity: 0
    },
    success: {
      topOpacity: 0.38,
      middleOpacity: 0.18,
      bottomOpacity: 0
    },
    danger: {
      topOpacity: 0.34,
      middleOpacity: 0.16,
      bottomOpacity: 0
    },
    warning: {
      topOpacity: 0.32,
      middleOpacity: 0.14,
      bottomOpacity: 0
    },
    muted: {
      topOpacity: 0.28,
      middleOpacity: 0.12,
      bottomOpacity: 0
    }
  },
  grid: {
    stroke: "#E2E8F0",
    strokeDasharray: "0",
    vertical: false
  },
  axis: {
    tick: { fontSize: 10, fill: "#64748B" },
    axisLine: false,
    tickLine: false,
    tickMargin: 10
  },
  legend: {
    wrapperStyle: { fontSize: 11, color: "#64748B" },
    pillClassName:
      "inline-flex items-center gap-2 rounded-pill border border-line-soft bg-white px-3 py-1 text-[11px] font-label tracking-[0.01em] text-graphite",
    subtlePillClassName:
      "inline-flex items-center gap-2 rounded-pill border border-line-soft bg-paper px-3 py-1 text-[11px] font-label tracking-[0.01em] text-graphite"
  },
  tooltip: {
    className:
      "rounded-card border border-line-soft bg-white/95 px-4 py-3.5 text-sm shadow-modal backdrop-blur-[8px]",
    titleClassName: "font-title text-[13px] leading-none tracking-[-0.01em] text-carbon",
    bodyClassName: "mt-3 space-y-2.5",
    rowClassName: "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 text-[12px] leading-tight",
    labelClassName: "font-base text-graphite",
    valueClassName: "font-label tabular-nums text-carbon",
    metaClassName: "text-[11px] leading-tight text-graphite"
  },
  bar: {
    barSize: 14,
    radius: [5, 5, 0, 0] as [number, number, number, number],
    horizontalRadius: [0, 5, 5, 0] as [number, number, number, number]
  },
  line: {
    strokeWidth: 1.7,
    type: "linear" as const,
    activeDotRadius: 4.5,
    activeDotStrokeWidth: 1.5
  },
  area: {
    strokeWidth: 1.7,
    type: "monotoneX" as const,
    fillOpacity: 0.24
  },
  sparkline: {
    strokeWidth: 1.45,
    type: "linear" as const,
    xTick: { fontSize: 9, fill: "#8A94A6" }
  },
  secondarySeries: {
    stroke: "#A8B3C7",
    fill: "#E6EBF5",
    strokeDasharray: "4 6",
    strokeOpacity: 0.9
  },
  dot: {
    haloRadius: 7,
    haloOpacity: 0.14,
    pointRadius: 2.6,
    pointStrokeWidth: 1.35
  }
};

export type ChartColorKey = keyof typeof chartTheme.gradients;

export function getChartGradientStops(colorKey: ChartColorKey) {
  const gradient = chartTheme.gradients[colorKey];
  const color = chartTheme.colors[colorKey];

  return [
    { offset: "0%", stopColor: color, stopOpacity: gradient.topOpacity },
    { offset: "55%", stopColor: color, stopOpacity: gradient.middleOpacity },
    { offset: "100%", stopColor: color, stopOpacity: gradient.bottomOpacity }
  ];
}

export function renderChartGradient(id: string, colorKey: ChartColorKey) {
  return React.createElement(
    "linearGradient",
    { id, x1: "0", y1: "0", x2: "0", y2: "1", key: `${id}-${colorKey}` },
    ...getChartGradientStops(colorKey).map((stop) =>
      React.createElement("stop", {
        key: `${id}-${stop.offset}`,
        offset: stop.offset,
        stopColor: stop.stopColor,
        stopOpacity: stop.stopOpacity
      })
    )
  );
}

export function renderChartEdgeFadeMask(id: string) {
  return React.createElement(
    "linearGradient",
    { id, x1: "0", y1: "0", x2: "1", y2: "0", key: `${id}-edge-mask` },
    React.createElement("stop", { offset: "0%", stopColor: "#FFFFFF", stopOpacity: 0 }),
    React.createElement("stop", { offset: "7%", stopColor: "#FFFFFF", stopOpacity: 0.32 }),
    React.createElement("stop", { offset: "16%", stopColor: "#FFFFFF", stopOpacity: 1 }),
    React.createElement("stop", { offset: "84%", stopColor: "#FFFFFF", stopOpacity: 1 }),
    React.createElement("stop", { offset: "93%", stopColor: "#FFFFFF", stopOpacity: 0.32 }),
    React.createElement("stop", { offset: "100%", stopColor: "#FFFFFF", stopOpacity: 0 })
  );
}

export function renderChartAreaMask(id: string, gradientId: string) {
  return React.createElement(
    "mask",
    { id, maskUnits: "objectBoundingBox", maskContentUnits: "objectBoundingBox", key: `${id}-area-mask` },
    React.createElement("rect", { x: 0, y: 0, width: 1, height: 1, fill: `url(#${gradientId})` })
  );
}

export function getChartGradientFill(id: string) {
  return `url(#${id})`;
}

export function getChartDot(color: string) {
  return {
    r: chartTheme.dot.pointRadius,
    fill: "#FFFFFF",
    stroke: color,
    strokeWidth: chartTheme.dot.pointStrokeWidth,
    filter: `drop-shadow(0 0 6px rgba(255,255,255,0.95)) drop-shadow(0 0 10px ${color}24)`
  };
}

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
  let hasPositive = false;
  let hasNegative = false;

  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && Math.abs(value) > 0) {
      consecutiveActivePoints += 1;
      maxConsecutiveActivePoints = Math.max(maxConsecutiveActivePoints, consecutiveActivePoints);
      if (value > 0) {
        hasPositive = true;
      }
      if (value < 0) {
        hasNegative = true;
      }
    } else {
      consecutiveActivePoints = 0;
    }
  }

  if (hasPositive && hasNegative) {
    return "linear";
  }

  const curveType: ConservativeCurveType = maxConsecutiveActivePoints >= 4 ? "monotoneX" : "linear";
  return curveType;
}

export function getAreaCurveType(values: Array<number | null | undefined>) {
  const hasNegative = values.some((value) => typeof value === "number" && Number.isFinite(value) && value < 0);

  return hasNegative ? getConservativeCurveType(values) : chartTheme.area.type;
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
