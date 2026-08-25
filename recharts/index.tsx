"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ComponentType,
  type MouseEvent,
  type ReactElement,
  type ReactNode
} from "react";

type Point = Record<string, string | number | null | undefined>;

type Margin = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

type ChartBaseProps = {
  data: Point[];
  width?: number;
  height?: number;
  margin?: Margin;
  layout?: "horizontal" | "vertical";
  barCategoryGap?: string | number;
  barGap?: string | number;
  children?: ReactNode;
  className?: string;
};

type AxisProps = {
  dataKey?: string;
  yAxisId?: string;
  tickFormatter?: (value: string | number) => string;
  [key: string]: unknown;
};

type SeriesProps = {
  dataKey: string;
  name?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  barSize?: number;
  fillOpacity?: number;
  shape?: (props: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    payload?: Point;
  }) => ReactNode;
  yAxisId?: string;
  type?: string;
  dot?: Record<string, unknown> | boolean;
  [key: string]: unknown;
};

type TooltipRenderProps = {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    name?: string;
    value?: string | number;
    color?: string;
    payload?: Point;
  }>;
  label?: string | number;
};

type TooltipProps = {
  content?: ReactElement<TooltipRenderProps> | ((props: TooltipRenderProps) => ReactNode);
  [key: string]: unknown;
};

type ContainerProps = {
  width?: string | number;
  height?: string | number;
  children: ReactElement;
};

function isChartChild<TProps extends object>(
  element: ReactNode,
  component: ComponentType<TProps>
): element is ReactElement<TProps> {
  return isValidElement(element) && element.type === component;
}

function pickChartProps(children: ReactNode) {
  const childArray = Children.toArray(children);
  const xAxis = childArray.find((child) => isChartChild(child, XAxis)) as ReactElement<AxisProps> | undefined;
  const yAxis = childArray.find((child) => isChartChild(child, YAxis)) as ReactElement<AxisProps> | undefined;
  const yAxes = childArray.filter((child) => isChartChild(child, YAxis)) as ReactElement<AxisProps>[];
  const legend = childArray.find((child) => isChartChild(child, Legend)) as ReactElement<Record<string, unknown>> | undefined;
  const tooltip = childArray.find((child) => isChartChild(child, Tooltip)) as ReactElement<TooltipProps> | undefined;
  const areas = childArray.filter((child) => isChartChild(child, Area)) as ReactElement<SeriesProps>[];
  const bars = childArray.filter((child) => isChartChild(child, Bar)) as ReactElement<SeriesProps>[];
  const lines = childArray.filter((child) => isChartChild(child, Line)) as ReactElement<SeriesProps>[];
  const svgDefs = childArray.filter((child) => isValidElement(child) && child.type === "defs") as ReactElement[];

  return { xAxis, yAxis, yAxes, legend, tooltip, areas, bars, lines, svgDefs };
}

function renderTooltipContent(content: TooltipProps["content"], props: TooltipRenderProps) {
  if (typeof content === "function") {
    return content(props);
  }

  if (isValidElement<TooltipRenderProps>(content)) {
    return cloneElement(content, props);
  }

  return null;
}

function getMargins(margin?: Margin) {
  return {
    top: Math.max(margin?.top ?? 16, 16),
    right: Math.max(margin?.right ?? 24, 42),
    bottom: Math.max(margin?.bottom ?? 24, 42),
    left: Math.max(margin?.left ?? 40, 56)
  };
}

function formatTick(value: number) {
  return `${Math.round(value)}`;
}

function formatAxisTick(axis: ReactElement<AxisProps> | undefined, value: number) {
  return axis?.props.tickFormatter ? axis.props.tickFormatter(value) : formatTick(value);
}

function getAxisDomainMax(axis: ReactElement<AxisProps> | undefined, dataMax: number) {
  const domain = axis?.props.domain;
  if (Array.isArray(domain)) {
    const maxDomain = domain[1];
    if (typeof maxDomain === "function") {
      const calculated = Number((maxDomain as (value: number) => number)(dataMax));
      return Number.isFinite(calculated) && calculated > 0 ? calculated : dataMax;
    }

    if (typeof maxDomain === "number" && maxDomain > 0) {
      return maxDomain;
    }
  }

  return dataMax;
}

function getAxisDomainMin(axis: ReactElement<AxisProps> | undefined, dataMin: number) {
  const domain = axis?.props.domain;
  if (Array.isArray(domain)) {
    const minDomain = domain[0];
    if (typeof minDomain === "function") {
      const calculated = Number((minDomain as (value: number) => number)(dataMin));
      return Number.isFinite(calculated) ? calculated : dataMin;
    }

    if (typeof minDomain === "number") {
      return minDomain;
    }
  }

  return Math.min(0, dataMin);
}

function buildTicks(minValue: number, maxValue: number, allowDecimals = true) {
  const safeMax = Math.max(maxValue, 1);
  const safeMin = Math.min(minValue, 0);

  if (!allowDecimals && safeMin === 0 && safeMax <= 5) {
    return Array.from({ length: Math.ceil(safeMax) + 1 }, (_value, index) => index);
  }

  return Array.from({ length: 5 }, (_value, index) => safeMin + ((safeMax - safeMin) / 4) * index);
}

function scaleValue(value: number, minValue: number, maxValue: number, height: number) {
  const range = Math.max(maxValue - minValue, 1);
  return height - ((value - minValue) / range) * height;
}

function getMonotonePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    const onlyPoint = points[0]!;
    return `M ${onlyPoint.x} ${onlyPoint.y}`;
  }

  const firstPoint = points[0]!;
  let path = `M ${firstPoint.x} ${firstPoint.y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]!;
    const next = points[index + 1]!;
    const prev = points[index - 1] ?? current;
    const after = points[index + 2] ?? next;

    const controlPoint1X = current.x + (next.x - prev.x) / 6;
    const controlPoint1Y = current.y + (next.y - prev.y) / 6;
    const controlPoint2X = next.x - (after.x - current.x) / 6;
    const controlPoint2Y = next.y - (after.y - current.y) / 6;

    path += ` C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${next.x} ${next.y}`;
  }

  return path;
}

function renderLegend(items: Array<{ name?: string; fill?: string; stroke?: string }>) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-graphite">
      {items.map((item, index) => (
        <div key={`${item.name ?? "series"}-${index}`} className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.fill ?? item.stroke ?? "#1F44FF" }}
          />
          <span>{item.name ?? `Serie ${index + 1}`}</span>
        </div>
      ))}
    </div>
  );
}

export function ResponsiveContainer({ width = "100%", height = "100%", children }: ContainerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const styles: CSSProperties = {
    width,
    height,
    minHeight: typeof height === "number" ? `${height}px` : undefined
  };

  return (
    <div ref={wrapperRef} style={styles} className="w-full">
      {size.width > 0 && size.height > 0
        ? cloneElement(children, { width: size.width, height: size.height })
        : null}
    </div>
  );
}

export function CartesianGrid(props: Record<string, unknown>) {
  void props;
  return null;
}

export function XAxis(props: AxisProps) {
  void props;
  return null;
}
XAxis.displayName = "XAxis";

export function YAxis(props: AxisProps) {
  void props;
  return null;
}
YAxis.displayName = "YAxis";

export function Tooltip(props: Record<string, unknown>) {
  void props;
  return null;
}

export function Legend(props: Record<string, unknown>) {
  void props;
  return null;
}

export function Bar(props: SeriesProps) {
  void props;
  return null;
}
Bar.displayName = "Bar";

export function Area(props: SeriesProps) {
  void props;
  return null;
}
Area.displayName = "Area";

export function Line(props: SeriesProps) {
  void props;
  return null;
}
Line.displayName = "Line";

export function BarChart({ data, width = 600, height = 320, margin, children, className, layout = "horizontal" }: ChartBaseProps) {
  const { xAxis, yAxis, legend, tooltip, bars, svgDefs } = useMemo(() => pickChartProps(children), [children]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const xKey = xAxis?.props.dataKey ?? "name";
  const yKey = yAxis?.props.dataKey ?? "value";
  const baseMargins = getMargins(margin);
  const margins = {
    ...baseMargins,
    left: layout === "vertical" ? Math.max(baseMargins.left, Number(yAxis?.props.width ?? 120)) : baseMargins.left
  };
  const chartWidth = Math.max(width - margins.left - margins.right, 1);
  const chartHeight = Math.max(height - margins.top - margins.bottom, 1);
  const maxValue = Math.max(
    1,
    ...data.flatMap((item) => bars.map((bar) => Number(item[bar.props.dataKey] ?? 0)))
  );
  const ticks = buildTicks(0, maxValue);
  const activePoint = activeIndex == null ? null : data[activeIndex] ?? null;
  const activeLabelValue = activePoint?.[layout === "vertical" ? yKey : xKey];

  function updateTooltipPosition(event: MouseEvent<SVGGElement>) {
    const svgRect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!svgRect) {
      return;
    }

    const x = event.clientX - svgRect.left;
    const y = event.clientY - svgRect.top;

    setTooltipPosition({
      x: Math.max(0, Math.min(width - 180, x + 12)),
      y: Math.max(0, Math.min(height - 100, y + 12))
    });
  }

  const tooltipNode =
    activePoint && tooltip?.props.content
      ? renderTooltipContent(tooltip.props.content, {
          active: true,
          label: activeLabelValue == null ? activeIndex ?? undefined : activeLabelValue,
          payload: bars.map((bar) => ({
            dataKey: bar.props.dataKey,
            name: bar.props.name ?? bar.props.dataKey,
            value: Number(activePoint[bar.props.dataKey] ?? 0),
            color: bar.props.stroke ?? bar.props.fill,
            payload: activePoint
          }))
        })
      : null;

  return (
    <div className={className}>
      <div className="relative">
        <svg width={width} height={height} role="img" aria-label="Bar chart">
          {svgDefs}
          <g transform={`translate(${margins.left}, ${margins.top})`}>
          <rect x={0} y={0} width={chartWidth} height={chartHeight} rx={14} fill="#FBFCFE" />

          {layout === "vertical"
            ? (
              <>
                {ticks.map((tick) => {
                  const x = (tick / maxValue) * chartWidth;
                  return (
                    <g key={`vertical-tick-${tick}`}>
                      <line x1={x} x2={x} y1={0} y2={chartHeight} stroke="#E8EBF2" strokeDasharray="4 6" />
                      <text x={x} y={-8} textAnchor="middle" fontSize="10" fill="#5A6373">
                        {formatAxisTick(xAxis, tick)}
                      </text>
                    </g>
                  );
                })}

                {data.map((item, index) => {
                  const rowHeight = chartHeight / Math.max(data.length, 1);
                  const barGap = 6;
                  const preferredBarHeight = bars[0]?.props.barSize ?? 16;
                  const maxBarHeight = Math.max(3, (rowHeight * 0.62 - barGap * Math.max(bars.length - 1, 0)) / Math.max(bars.length, 1));
                  const barHeight = Math.min(preferredBarHeight, maxBarHeight);
                  const groupHeight = bars.length * barHeight + Math.max(bars.length - 1, 0) * barGap;
                  const y = index * rowHeight + (rowHeight - groupHeight) / 2;

                  return (
                    <g
                      key={`${String(item[yKey] ?? index)}`}
                      onMouseEnter={(event) => {
                        setActiveIndex(index);
                        updateTooltipPosition(event);
                      }}
                      onMouseMove={updateTooltipPosition}
                      onMouseLeave={() => setActiveIndex(null)}
                    >
                      {bars.map((bar, barIndex) => {
                        const value = Number(item[bar.props.dataKey] ?? 0);
                        const barWidthValue = (value / maxValue) * chartWidth;
                        const barY = y + barIndex * (barHeight + barGap);
                        const shape = bar.props.shape;

                        return shape ? (
                          <g key={bar.props.dataKey}>{shape({ x: 0, y: barY, width: barWidthValue, height: barHeight, payload: item })}</g>
                        ) : (
                          <rect
                            key={bar.props.dataKey}
                            x={0}
                            y={barY}
                            width={barWidthValue}
                            height={barHeight}
                            rx={Math.min(6, barHeight / 2)}
                            fill={bar.props.fill ?? "#1F44FF"}
                            fillOpacity={typeof bar.props.fillOpacity === "number" ? bar.props.fillOpacity : 1}
                            filter={typeof bar.props.filter === "string" ? bar.props.filter : undefined}
                          />
                        );
                      })}
                      <text x={-10} y={y + groupHeight / 2 + 4} textAnchor="end" fontSize="10" fill="#0B0E14">
                        {String(item[yKey] ?? index)}
                      </text>
                    </g>
                  );
                })}
              </>
            )
            : (
              <>
                {ticks.map((tick) => {
                  const y = scaleValue(tick, 0, maxValue, chartHeight);
                  return (
                    <g key={`horizontal-tick-${tick}`}>
                      <line x1={0} x2={chartWidth} y1={y} y2={y} stroke="#E8EBF2" strokeDasharray="4 6" />
                      <text x={-8} y={y + 4} textAnchor="end" fontSize="10" fill="#5A6373">
                        {formatAxisTick(yAxis, tick)}
                      </text>
                    </g>
                  );
                })}

                {data.map((item, index) => {
                  const bandWidth = chartWidth / Math.max(data.length, 1);
                  const barGap = 8;
                  const preferredBarWidth = bars[0]?.props.barSize ?? 18;
                  const maxBarWidth = Math.max(3, (bandWidth * 0.62 - barGap * Math.max(bars.length - 1, 0)) / Math.max(bars.length, 1));
                  const barWidth = Math.min(preferredBarWidth, maxBarWidth);
                  const groupWidth = bars.length * barWidth + Math.max(bars.length - 1, 0) * barGap;
                  const x = index * bandWidth + (bandWidth - groupWidth) / 2;

                  return (
                    <g
                      key={`${String(item[xKey] ?? index)}`}
                      onMouseEnter={(event) => {
                        setActiveIndex(index);
                        updateTooltipPosition(event);
                      }}
                      onMouseMove={updateTooltipPosition}
                      onMouseLeave={() => setActiveIndex(null)}
                    >
                      {bars.map((bar, barIndex) => {
                        const value = Number(item[bar.props.dataKey] ?? 0);
                        const barHeight = (value / maxValue) * chartHeight;
                        const barX = x + barIndex * (barWidth + barGap);
                        const barY = chartHeight - barHeight;
                        const shape = bar.props.shape;

                        return shape ? (
                          <g key={bar.props.dataKey}>{shape({ x: barX, y: barY, width: barWidth, height: barHeight, payload: item })}</g>
                        ) : (
                          <rect
                            key={bar.props.dataKey}
                            x={barX}
                            y={barY}
                            width={Math.max(barWidth, 1)}
                            height={barHeight}
                            rx={Math.min(6, barWidth / 2)}
                            fill={bar.props.fill ?? "#1F44FF"}
                            fillOpacity={typeof bar.props.fillOpacity === "number" ? bar.props.fillOpacity : 1}
                            filter={typeof bar.props.filter === "string" ? bar.props.filter : undefined}
                          />
                        );
                      })}
                      <text
                        x={x + groupWidth / 2}
                        y={chartHeight + 22}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#5A6373"
                      >
                        {String(item[xKey] ?? index)}
                      </text>
                    </g>
                  );
                })}
              </>
            )}
          </g>
        </svg>
        {tooltipNode ? (
          <div
            className="pointer-events-none absolute z-10"
            style={{ left: `${tooltipPosition.x}px`, top: `${tooltipPosition.y}px` }}
          >
            {tooltipNode}
          </div>
        ) : null}
      </div>
      {legend ? renderLegend(bars.map((bar) => ({ name: bar.props.name, fill: bar.props.fill }))) : null}
    </div>
  );
}

export function ComposedChart({ data, width = 600, height = 320, margin, children, className }: ChartBaseProps) {
  const { xAxis, yAxis, yAxes, legend, tooltip, areas, bars, lines, svgDefs } = useMemo(() => pickChartProps(children), [children]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const xKey = xAxis?.props.dataKey ?? "name";
  const margins = getMargins(margin);
  const chartWidth = Math.max(width - margins.left - margins.right, 1);
  const chartHeight = Math.max(height - margins.top - margins.bottom, 1);
  const leftValues = data.flatMap((item) => [
    ...areas.map((area) => Number(item[area.props.dataKey] ?? 0)),
    ...bars.map((bar) => Number(item[bar.props.dataKey] ?? 0))
  ]);
  const rawLeftMax = Math.max(1, ...leftValues);
  const rawLeftMin = Math.min(0, ...leftValues);
  const leftMin = getAxisDomainMin(yAxis, rawLeftMin);
  const leftMax = getAxisDomainMax(yAxis, rawLeftMax);
  const rightValues = data.flatMap((item) => lines.map((line) => Number(item[line.props.dataKey] ?? 0)));
  const rawRightMax = Math.max(1, ...rightValues);
  const rightAxis = yAxes.find((axis) => axis.props.orientation === "right" || axis.props.yAxisId === "right");
  const rightMax = getAxisDomainMax(rightAxis, rawRightMax);
  const rightMin = 0;
  const leftTicks = buildTicks(leftMin, leftMax);
  const rightTicks = buildTicks(
    rightMin,
    rightMax,
    !Boolean(lines.some((line) => line.props.dataKey.toLowerCase().includes("clientes")))
  );
  const bandWidth = chartWidth / Math.max(data.length, 1);
  const barGap = 8;
  const preferredBarWidth = bars[0]?.props.barSize ?? 16;
  const maxBarWidth = Math.max(3, (bandWidth * 0.72 - barGap * Math.max(bars.length - 1, 0)) / Math.max(bars.length, 1));
  const barWidth = Math.min(preferredBarWidth, maxBarWidth);
  const groupWidth = bars.length * barWidth + Math.max(bars.length - 1, 0) * barGap;
  const activePoint = activeIndex == null ? null : data[activeIndex] ?? null;
  const activeLabelValue = activePoint?.[xKey];

  function updateTooltipPosition(event: MouseEvent<SVGGElement>) {
    const svgRect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!svgRect) {
      return;
    }

    const x = event.clientX - svgRect.left;
    const y = event.clientY - svgRect.top;

    setTooltipPosition({
      x: Math.max(0, Math.min(width - 180, x + 12)),
      y: Math.max(0, Math.min(height - 100, y + 12))
    });
  }

  const tooltipNode =
    activePoint && tooltip?.props.content
      ? renderTooltipContent(tooltip.props.content, {
          active: true,
          label: activeLabelValue == null ? activeIndex ?? undefined : activeLabelValue,
          payload: [
            ...bars.map((bar) => ({
              dataKey: bar.props.dataKey,
              name: bar.props.name ?? bar.props.dataKey,
              value: Number(activePoint[bar.props.dataKey] ?? 0),
              color: bar.props.stroke ?? bar.props.fill,
              payload: activePoint
            })),
            ...lines.map((line) => ({
              dataKey: line.props.dataKey,
              name: line.props.name ?? line.props.dataKey,
              value: Number(activePoint[line.props.dataKey] ?? 0),
              color: line.props.stroke,
              payload: activePoint
            }))
          ]
        })
      : null;

  return (
    <div className={className}>
      <div className="relative">
        <svg width={width} height={height} role="img" aria-label="Composed chart">
          {svgDefs}
          <g transform={`translate(${margins.left}, ${margins.top})`}>
            <rect x={0} y={0} width={chartWidth} height={chartHeight} rx={14} fill="#FBFCFE" />

            {leftTicks.map((tick) => {
              const y = scaleValue(tick, leftMin, leftMax, chartHeight);
              return (
                <g key={`left-${tick}`}>
                  <line x1={0} x2={chartWidth} y1={y} y2={y} stroke="#E8EBF2" strokeDasharray="4 6" />
                  <text x={-8} y={y + 4} textAnchor="end" fontSize="10" fill="#5A6373">
                    {formatAxisTick(yAxis, tick)}
                  </text>
                </g>
              );
            })}

            {rightTicks.map((tick) => {
              const y = scaleValue(tick, rightMin, rightMax, chartHeight);
              return (
                <text key={`right-${tick}`} x={chartWidth + 8} y={y + 4} textAnchor="start" fontSize="10" fill="#5A6373">
                  {formatAxisTick(rightAxis, tick)}
                </text>
              );
            })}

            {areas.map((area) => {
              const color = area.props.stroke ?? area.props.fill ?? "#1F44FF";
              const areaType = (area.props as SeriesProps & { type?: string }).type ?? "linear";
              const points = data.map((item, index) => {
                const value = Number(item[area.props.dataKey] ?? 0);
                return {
                  x: index * bandWidth + bandWidth / 2,
                  y: scaleValue(value, leftMin, leftMax, chartHeight),
                  value
                };
              });
              const topPath = areaType === "monotone"
                ? getMonotonePath(points)
                : points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
              const fill = area.props.fill ?? color;
              const fillOpacity = typeof area.props.fillOpacity === "number" ? area.props.fillOpacity : 1;

              if (points.length === 0) {
                return null;
              }

              const firstPoint = points[0]!;
              const lastPoint = points[points.length - 1]!;
              const areaPath = `${topPath} L ${lastPoint.x} ${chartHeight} L ${firstPoint.x} ${chartHeight} Z`;

              return (
                <path
                  key={area.props.dataKey}
                  d={areaPath}
                  fill={fill}
                  fillOpacity={fillOpacity}
                  stroke={color}
                  strokeWidth={area.props.strokeWidth ?? 0}
                />
              );
            })}

            {data.map((item, index) => {
              const x = index * bandWidth + (bandWidth - groupWidth) / 2;
              return (
                <g
                  key={`${String(item[xKey] ?? index)}`}
                  onMouseEnter={(event) => {
                    setActiveIndex(index);
                    updateTooltipPosition(event);
                  }}
                  onMouseMove={updateTooltipPosition}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  <rect x={index * bandWidth} y={0} width={bandWidth} height={chartHeight} fill="transparent" />
                  {bars.map((bar, barIndex) => {
                    const value = Number(item[bar.props.dataKey] ?? 0);
                    const zeroY = scaleValue(0, leftMin, leftMax, chartHeight);
                    const valueY = scaleValue(value, leftMin, leftMax, chartHeight);
                    const barHeight = Math.max(Math.abs(zeroY - valueY), value === 0 ? 0 : 2);
                    const barX = x + barIndex * (barWidth + barGap);
                    const barY = value >= 0 ? valueY : zeroY;

                    return (
                      <rect
                        key={bar.props.dataKey}
                        x={barX}
                        y={barY}
                        width={Math.max(barWidth, 1)}
                        height={barHeight}
                        rx={Math.min(6, barWidth / 2)}
                        fill={bar.props.fill ?? "#1F44FF"}
                        fillOpacity={typeof bar.props.fillOpacity === "number" ? bar.props.fillOpacity : 1}
                        stroke={bar.props.stroke ?? "none"}
                        strokeWidth={bar.props.strokeWidth ?? 0}
                        filter={typeof bar.props.filter === "string" ? bar.props.filter : undefined}
                      />
                    );
                  })}
                  <text
                    x={x + groupWidth / 2}
                    y={chartHeight + 20}
                    textAnchor="end"
                    fontSize="10"
                    fill="#5A6373"
                    transform={`rotate(-15 ${x + groupWidth / 2} ${chartHeight + 20})`}
                  >
                    {String(item[xKey] ?? index)}
                  </text>
                </g>
              );
            })}

            {lines.map((line) => {
              const color = line.props.stroke ?? "#5A6373";
              const lineType = (line.props as SeriesProps & { type?: string }).type ?? "linear";
              const points = data.map((item, index) => {
                const value = Number(item[line.props.dataKey] ?? 0);
                return {
                  x: index * bandWidth + bandWidth / 2,
                  y: scaleValue(value, rightMin, rightMax, chartHeight),
                  value
                };
              });
              const path = lineType === "monotone"
                ? getMonotonePath(points)
                : points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
              const dotRadius =
                typeof line.props.dot === "object" && line.props.dot !== null && "r" in line.props.dot
                  ? Number((line.props.dot as { r?: number }).r ?? 3.5)
                  : 3.5;

              return (
                <g key={line.props.dataKey}>
                  <path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth={line.props.strokeWidth ?? 2}
                    strokeDasharray={line.props.strokeDasharray}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {points.map((point, index) => (
                    <circle key={index} cx={point.x} cy={point.y} r={dotRadius} fill={color} stroke="#FFFFFF" strokeWidth="1.5" />
                  ))}
                </g>
              );
            })}
          </g>
        </svg>

        {tooltipNode ? (
          <div
            className="pointer-events-none absolute z-10"
            style={{ left: `${tooltipPosition.x}px`, top: `${tooltipPosition.y}px` }}
          >
            {tooltipNode}
          </div>
        ) : null}
      </div>
      {legend
        ? renderLegend([
            ...areas.map((area) => ({ name: area.props.name, fill: area.props.fill, stroke: area.props.stroke })),
            ...bars.map((bar) => ({ name: bar.props.name, fill: bar.props.fill })),
            ...lines.map((line) => ({ name: line.props.name, stroke: line.props.stroke }))
          ])
        : null}
    </div>
  );
}

export function AreaChart(props: ChartBaseProps) {
  return <ComposedChart {...props} />;
}

export function LineChart({ data, width = 600, height = 320, margin, children, className }: ChartBaseProps) {
  const { xAxis, yAxis, legend, lines, svgDefs } = useMemo(() => pickChartProps(children), [children]);
  const xKey = xAxis?.props.dataKey ?? "name";
  const hasAxes = Boolean(xAxis || yAxis);
  const margins = hasAxes
    ? getMargins(margin)
    : {
        top: margin?.top ?? 4,
        right: margin?.right ?? 4,
        bottom: margin?.bottom ?? 4,
        left: margin?.left ?? 4
      };
  const chartWidth = Math.max(width - margins.left - margins.right, 1);
  const chartHeight = Math.max(height - margins.top - margins.bottom, 1);
  const yMax = Math.max(
    1,
    ...data.flatMap((item) => lines.map((line) => Number(item[line.props.dataKey] ?? 0)))
  );
  const stepX = chartWidth / Math.max(data.length - 1, 1);
  const pointsByLine = lines.map((line) =>
    data.map((item, index) => {
      const value = Number(item[line.props.dataKey] ?? 0);
      const x = index * stepX;
      const y = chartHeight - (value / yMax) * chartHeight;
      return { x, y, value };
    })
  );

  return (
    <div className={className}>
      <svg width={width} height={height} role="img" aria-label="Line chart">
        {svgDefs}
        <g transform={`translate(${margins.left}, ${margins.top})`}>
          {hasAxes ? Array.from({ length: 5 }, (_value, index) => {
            const y = (chartHeight / 4) * index;
            const tick = (yMax / 4) * (4 - index);
            return (
              <g key={index}>
                <line x1={0} x2={chartWidth} y1={y} y2={y} stroke="#EAECF0" strokeDasharray="4 4" />
                <text x={-8} y={y + 4} textAnchor="end" fontSize="10" fill="#5A6373">
                  {formatTick(tick)}
                </text>
              </g>
            );
          }) : null}

          {lines.map((line, lineIndex) => {
            const color = line.props.stroke ?? "#1F44FF";
            const lineType = (line.props as SeriesProps & { type?: string }).type ?? "linear";
            const points = pointsByLine[lineIndex] ?? [];
            const path = lineType === "monotone"
              ? getMonotonePath(points)
              : points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
            const shouldRenderDots = line.props.dot !== false;
            const dotRadius =
              typeof line.props.dot === "object" && line.props.dot !== null && "r" in line.props.dot
                ? Number((line.props.dot as { r?: number }).r ?? 3.5)
                : 3.5;

            return (
              <g key={line.props.dataKey}>
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={line.props.strokeWidth ?? 2}
                  strokeDasharray={line.props.strokeDasharray}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {shouldRenderDots ? points.map((point, index) => (
                  <circle key={index} cx={point.x} cy={point.y} r={dotRadius} fill={color} />
                )) : null}
              </g>
            );
          })}

          {hasAxes ? data.map((item, index) => (
            <text
              key={`${String(item[xKey] ?? index)}-label`}
              x={index * stepX}
              y={chartHeight + 18}
              textAnchor="middle"
              fontSize="10"
              fill="#5A6373"
            >
              {String(item[xKey] ?? index)}
            </text>
          )) : null}
        </g>
      </svg>
      {legend ? renderLegend(lines.map((line) => ({ name: line.props.name, stroke: line.props.stroke }))) : null}
    </div>
  );
}
