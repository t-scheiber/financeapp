"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Lazy load recharts components for forecast chart
const LazyAreaChart = dynamic(
  () => import("recharts").then((mod) => mod.AreaChart),
  { ssr: false }
);
const LazyArea = dynamic(
  () => import("recharts").then((mod) => mod.Area),
  { ssr: false }
);
const LazyXAxis = dynamic(
  () => import("recharts").then((mod) => mod.XAxis),
  { ssr: false }
);
const LazyTooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip),
  { ssr: false }
);
const LazyResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);

interface ForecastPoint {
  date: string;
  predictedPrice: number;
  confidence: number;
  method: string;
}

interface LazyForecastChartProps {
  data: ForecastPoint[];
  formatCurrency: (value: number) => string;
}

function ForecastChartLoading() {
  return (
    <div className="flex h-48 items-center justify-center rounded-xl border border-border/60 bg-card/70">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-accent/50" />
        <p className="text-xs text-muted-foreground">Loading chart...</p>
      </div>
    </div>
  );
}

export function LazyForecastChart({ data, formatCurrency }: LazyForecastChartProps) {
  if (typeof window === "undefined") {
    return <ForecastChartLoading />;
  }

  return (
    <div className="h-48 w-full overflow-hidden rounded-xl border border-border/60 bg-card/70 p-4">
      <LazyResponsiveContainer width="100%" height="100%">
        <LazyAreaChart data={data}>
          <defs>
            <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <LazyXAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            stroke="hsl(215.4 16.3% 46.9%)"
          />
          <LazyTooltip
            formatter={(value) => [
              formatCurrency(Number(value)),
              "Projected close",
            ]}
          />
          <LazyArea
            type="monotone"
            dataKey="predictedPrice"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#forecastGradient)"
            activeDot={{ r: 4 }}
          />
        </LazyAreaChart>
      </LazyResponsiveContainer>
    </div>
  );
}

