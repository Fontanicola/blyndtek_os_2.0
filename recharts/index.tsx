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
  children?: ReactNode;
  className?: string;
};

type AxisProps = {
  dataKey?: string;
  tickFormatter?: (value: string | number) => string;
  [key: string]: unknown;
};

type SeriesProps = {
  dataKey: string;
  name?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
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
  const legend = childArray.find((child) => isChartChild(child, Legend)) as ReactElement<Record<string, unknown>> | undefined;
  const bars = childArray.filter((child) => isChartChild(child, Bar)) as ReactElement<SeriesProps>[];
  const lines = childArray.filter((child) => isChartChild(child, Line)) as ReactElement<SeriesProps>[];

  return { xAxis, legend, bars, lines };
}

function getMargins(margin?: Margin) {
  return {
    top: margin?.top ?? 16,
    right: margin?.right ?? 24,
    bottom: margin?.bottom ?? 24,
    left: margin?.left ?? 40
  };
}

function formatTick(value: number) {
  return `${Math.round(value)}`;
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

export function Line(props: SeriesProps) {
  void props;
  return null;
}
Line.displayName = "Line";

export function BarChart({ data, width = 600, height = 320, margin, children, className }: ChartBaseProps) {
  const { xAxis, legend, bars } = useMemo(() => pickChartProps(children), [children]);
  const xKey = xAxis?.props.dataKey ?? "name";
  const margins = getMargins(margin);
  const chartWidth = Math.max(width - margins.left - margins.right, 1);
  const chartHeight = Math.max(height - margins.top - margins.bottom, 1);
  const yMax = Math.max(
    1,
    ...data.flatMap((item) =>
      bars.map((bar) => Number(item[bar.props.dataKey] ?? 0))
    )
  );
  const bandWidth = chartWidth / Math.max(data.length, 1);
  const groupWidth = bandWidth * 0.7;
  const barWidth = groupWidth / Math.max(bars.length, 1);
  const ticks = Array.from({ length: 5 }, (_value, index) => (yMax / 4) * (4 - index));

  return (
    <div className={className}>
      <svg width={width} height={height} role="img" aria-label="Bar chart">
        <g transform={`translate(${margins.left}, ${margins.top})`}>
          {ticks.map((tick, index) => {
            const y = (chartHeight / 4) * index;
            return (
              <g key={tick}>
                <line x1={0} x2={chartWidth} y1={y} y2={y} stroke="#EAECF0" strokeDasharray="4 4" />
                <text x={-8} y={y + 4} textAnchor="end" fontSize="10" fill="#5A6373">
                  {formatTick(tick)}
                </text>
              </g>
            );
          })}

          {data.map((item, index) => {
            const x = index * bandWidth + (bandWidth - groupWidth) / 2;
            return (
              <g key={`${String(item[xKey] ?? index)}`}>
                {bars.map((bar, barIndex) => {
                  const value = Number(item[bar.props.dataKey] ?? 0);
                  const barHeight = (value / yMax) * chartHeight;
                  const barX = x + barIndex * barWidth;
                  const barY = chartHeight - barHeight;

                  return (
                    <rect
                      key={bar.props.dataKey}
                      x={barX}
                      y={barY}
                      width={Math.max(barWidth - 4, 1)}
                      height={barHeight}
                      rx={6}
                      fill={bar.props.fill ?? "#1F44FF"}
                    />
                  );
                })}
                <text
                  x={x + groupWidth / 2}
                  y={chartHeight + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#5A6373"
                >
                  {String(item[xKey] ?? index)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      {legend ? renderLegend(bars.map((bar) => ({ name: bar.props.name, fill: bar.props.fill }))) : null}
    </div>
  );
}

export function LineChart({ data, width = 600, height = 320, margin, children, className }: ChartBaseProps) {
  const { xAxis, legend, lines } = useMemo(() => pickChartProps(children), [children]);
  const xKey = xAxis?.props.dataKey ?? "name";
  const margins = getMargins(margin);
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
        <g transform={`translate(${margins.left}, ${margins.top})`}>
          {Array.from({ length: 5 }, (_value, index) => {
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
          })}

          {lines.map((line, lineIndex) => {
            const color = line.props.stroke ?? "#1F44FF";
            const points = pointsByLine[lineIndex] ?? [];
            const path = points
              .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
              .join(" ");

            return (
              <g key={line.props.dataKey}>
                <path d={path} fill="none" stroke={color} strokeWidth={line.props.strokeWidth ?? 2} />
                {points.map((point, index) => (
                  <circle key={index} cx={point.x} cy={point.y} r={3.5} fill={color} />
                ))}
              </g>
            );
          })}

          {data.map((item, index) => (
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
          ))}
        </g>
      </svg>
      {legend ? renderLegend(lines.map((line) => ({ name: line.props.name, stroke: line.props.stroke }))) : null}
    </div>
  );
}
