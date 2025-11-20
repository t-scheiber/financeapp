"use client";

import { clsx } from "clsx";
import { useEffect, useMemo, useState } from "react";
import type { TooltipProps } from "recharts";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface StockPrice {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

interface News {
  publishedAt: string;
  sentiment?: string;
  title: string;
}

interface StockChartProps {
  stockPrices: StockPrice[];
  news: News[];
}

type Sentiment = "positive" | "negative" | "neutral";

interface ChartDataPoint {
  iso: string;
  label: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  dateObj: Date;
}

interface MarkerPoint {
  date: string;
  close: number;
  sentiment: Sentiment;
  newsTitle: string;
}

type MetricKey = "close" | "open" | "high" | "low" | "volume";

const METRIC_CONFIG: Record<
  MetricKey,
  {
    label: string;
    description: string;
    color: string;
  }
> = {
  close: {
    label: "Close",
    description: "Daily closing price",
    color: "hsl(211 100% 50%)",
  },
  open: {
    label: "Open",
    description: "Opening price",
    color: "hsl(160 84% 39%)",
  },
  high: {
    label: "High",
    description: "Session high",
    color: "hsl(43 96% 56%)",
  },
  low: {
    label: "Low",
    description: "Session low",
    color: "hsl(5 88% 60%)",
  },
  volume: {
    label: "Volume",
    description: "Traded volume (thousands)",
    color: "hsl(263 87% 67%)",
  },
};

const STORAGE_KEY = "financeapp-chart-metrics";

function loadStoredMetrics(): MetricKey[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const filtered = parsed.filter((metric: unknown): metric is MetricKey =>
      Object.hasOwn(METRIC_CONFIG, metric as string),
    );
    return filtered.length > 0 ? filtered : null;
  } catch {
    return null;
  }
}

interface CustomTooltipEntry {
  name?: string;
  value?: number;
  color?: string;
}

interface CustomTooltipProps
  extends TooltipProps<number | string, string | number> {
  payload?: CustomTooltipEntry[];
  label?: string | number;
}

export function StockChart({ stockPrices, news }: StockChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([
    "close",
    "volume",
  ]);

  useEffect(() => {
    const stored = loadStoredMetrics();
    if (stored) {
      const ensureClose: MetricKey[] = stored.includes("close")
        ? stored
        : (["close", ...stored] as MetricKey[]);
      setSelectedMetrics(Array.from(new Set<MetricKey>(ensureClose)));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedMetrics));
    } catch {
      // Ignore storage write failures (e.g., private browsing).
    }
  }, [selectedMetrics]);

  const chartData = useMemo<ChartDataPoint[]>(() => {
    return stockPrices
      .map((price) => {
        const dateObj = new Date(price.date);
        return {
          iso: dateObj.toISOString(),
          label: dateObj.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          close: price.close,
          open: price.open,
          high: price.high,
          low: price.low,
          volume:
            typeof price.volume === "number"
              ? Math.max(price.volume / 1000, 0)
              : undefined,
          dateObj,
        };
      })
      .reverse();
  }, [stockPrices]);

  const markers = useMemo<MarkerPoint[]>(() => {
    if (chartData.length === 0) return [];
    return news
      .filter((article) => article.sentiment && article.sentiment !== "neutral")
      .map((article) => {
        const newsDate = new Date(article.publishedAt);
        const closest = chartData.reduce((prev, curr) => {
          const prevDiff = Math.abs(
            prev.dateObj.getTime() - newsDate.getTime(),
          );
          const currDiff = Math.abs(
            curr.dateObj.getTime() - newsDate.getTime(),
          );
          return currDiff < prevDiff ? curr : prev;
        });
        return {
          date: closest.label,
          close: closest.close,
          sentiment: article.sentiment as Sentiment,
          newsTitle: article.title,
        };
      });
  }, [chartData, news]);

  const priceExtent = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 0, diff: 0 };
    const values = chartData.map((d) => d.close);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const diff = max - min;
    return { min, max, diff };
  }, [chartData]);

  const hasVolume = useMemo(
    () => chartData.some((entry) => typeof entry.volume === "number"),
    [chartData],
  );

  const isUptrend =
    chartData.length > 1 &&
    chartData[chartData.length - 1].close > chartData[0].close;

  const toggleMetric = (metric: MetricKey) => {
    setSelectedMetrics((prev) => {
      if (metric === "close") {
        return prev;
      }
      const exists = prev.includes(metric);
      if (exists) {
        return prev.filter((item) => item !== metric);
      }
      return [...prev, metric];
    });
  };

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload || payload.length === 0) return null;
    const marker = markers.find((item) => item.date === label);
    const closeValue = payload.find((item) => item.name === "close")?.value;

    return (
      <div className="rounded-xl border border-border/60 bg-card/95 p-4 text-sm shadow-lg dark:bg-card/90">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {typeof closeValue === "number" ? (
          <p className="mt-1 text-lg font-semibold text-foreground">
            ${closeValue.toFixed(2)}
          </p>
        ) : null}
        <dl className="mt-3 space-y-1.5">
          {payload
            .filter(
              (entry) =>
                typeof entry.value === "number" &&
                entry.name !== "tooltipFormatter",
            )
            .map((entry) => (
              <div
                key={entry.name}
                className="flex items-center justify-between"
              >
                <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {METRIC_CONFIG[entry.name as MetricKey]?.label ?? entry.name}
                </dt>
                <dd className="text-xs font-semibold text-foreground">
                  {entry.name === "volume"
                    ? `${Number(entry.value).toLocaleString()}k`
                    : `$${Number(entry.value).toFixed(2)}`}
                </dd>
              </div>
            ))}
        </dl>
        {marker ? (
          <div className="mt-3 rounded-lg border border-border/40 bg-muted/40 p-2">
            <p
              className={clsx(
                "text-xs font-semibold",
                marker.sentiment === "positive"
                  ? "text-emerald-600"
                  : "text-rose-600",
              )}
            >
              Sentiment: {marker.sentiment}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {marker.newsTitle}
            </p>
          </div>
        ) : null}
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-3xl border border-dashed border-border/50 bg-muted/40">
        <p className="text-sm text-muted-foreground">
          No price data available for chart
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground sm:text-xl">
            Performance overview
          </h3>
          {chartData.length > 1 ? (
            <p className="text-sm text-muted-foreground">
              <span
                className={clsx(
                  "inline-flex items-center gap-2 font-medium",
                  isUptrend ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {isUptrend ? "Up" : "Down"}{" "}
                {Math.abs(
                  ((chartData[chartData.length - 1].close -
                    chartData[0].close) /
                    chartData[0].close) *
                    100,
                ).toFixed(2)}
                % over period
              </span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((metric) => {
            const config = METRIC_CONFIG[metric];
            const isActive = selectedMetrics.includes(metric);
            const disabled = metric === "volume" && !hasVolume;
            return (
              <button
                key={metric}
                type="button"
                onClick={() => {
                  if (disabled) return;
                  toggleMetric(metric);
                }}
                aria-pressed={isActive}
                disabled={metric === "close" || disabled}
                className={clsx(
                  "group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition",
                  "border-border/60 bg-card/70 text-muted-foreground backdrop-blur dark:bg-card/50",
                  isActive &&
                    "border-accent/60 bg-accent/10 text-foreground shadow-[0_0_0_1px] shadow-accent/10",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <span className="font-medium">{config.label}</span>
                <span className="hidden text-[10px] text-muted-foreground/80 sm:inline">
                  {config.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={chartData}>
          <defs>
            <linearGradient id="closeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={
                  isUptrend ? "hsl(160 100% 40%)" : METRIC_CONFIG.close.color
                }
                stopOpacity={0.32}
              />
              <stop
                offset="95%"
                stopColor={
                  isUptrend ? "hsl(160 100% 40%)" : METRIC_CONFIG.close.color
                }
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(148, 163, 184, 0.35)"
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "hsl(215 16% 47%)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            dataKey="close"
            tick={{ fill: "hsl(215 16% 47%)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            domain={[
              Math.max(0, priceExtent.min - priceExtent.diff * 0.12),
              priceExtent.max + priceExtent.diff * 0.12,
            ]}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          {hasVolume ? (
            <YAxis
              yAxisId="right"
              orientation="right"
              dataKey="volume"
              tick={{ fill: "hsl(215 16% 47%)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) =>
                typeof value === "number" ? `${value.toLocaleString()}k` : ""
              }
            />
          ) : null}
          <Tooltip content={<CustomTooltip />} />

          {selectedMetrics.includes("volume") && hasVolume ? (
            <Bar
              yAxisId="right"
              dataKey="volume"
              fill={METRIC_CONFIG.volume.color}
              opacity={0.28}
              radius={[10, 10, 0, 0]}
              maxBarSize={26}
              name="volume"
            />
          ) : null}

          {selectedMetrics.includes("close") ? (
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="close"
              strokeWidth={2}
              stroke={
                isUptrend ? "hsl(160 100% 34%)" : METRIC_CONFIG.close.color
              }
              fill="url(#closeGradient)"
              name="close"
            />
          ) : null}

          {selectedMetrics.includes("open") ? (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="open"
              stroke={METRIC_CONFIG.open.color}
              strokeWidth={1.6}
              dot={false}
              name="open"
            />
          ) : null}

          {selectedMetrics.includes("high") ? (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="high"
              stroke={METRIC_CONFIG.high.color}
              strokeDasharray="5 3"
              strokeWidth={1.4}
              dot={false}
              name="high"
            />
          ) : null}

          {selectedMetrics.includes("low") ? (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="low"
              stroke={METRIC_CONFIG.low.color}
              strokeDasharray="5 3"
              strokeWidth={1.4}
              dot={false}
              name="low"
            />
          ) : null}

          {markers.map((marker, index) => (
            <ReferenceDot
              key={`${marker.date}-${index}`}
              x={marker.date}
              y={marker.close}
              r={5}
              fill={marker.sentiment === "positive" ? "#10b981" : "#f97316"}
              stroke="#fff"
              strokeWidth={1.5}
              yAxisId="left"
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
