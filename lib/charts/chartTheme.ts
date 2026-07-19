export const chartTheme = {
  colors: {
    signal: "#1F44FF",
    success: "#38A169",
    danger: "#E53E3E",
    warning: "#D97706",
    graphite: "#5A6373",
    carbon: "#0B0E14",
    muted: "#CBD3E1",
    line: "#EAECF0",
    paper: "#EEF0F4"
  },
  grid: {
    stroke: "#EAECF0",
    strokeDasharray: "3 3",
    vertical: false
  },
  axis: {
    tick: { fontSize: 11, fill: "#5A6373" },
    axisLine: false,
    tickLine: false
  },
  legend: {
    wrapperStyle: { fontSize: 12, color: "#5A6373" }
  },
  tooltip: {
    className: "rounded-card border border-line-soft bg-white p-3 text-sm shadow-modal"
  },
  bar: {
    barSize: 16,
    radius: [4, 4, 0, 0] as [number, number, number, number],
    horizontalRadius: [0, 4, 4, 0] as [number, number, number, number]
  }
};

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
