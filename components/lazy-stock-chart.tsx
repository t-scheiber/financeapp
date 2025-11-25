"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Lazy load the heavy recharts-based stock chart component
const StockChart = dynamic(
  () => import("@/components/stock-chart").then((mod) => ({ default: mod.StockChart })),
  {
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-3xl border border-dashed border-border/50 bg-muted/20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent/50" />
          <p className="text-sm text-muted-foreground">Loading chart...</p>
        </div>
      </div>
    ),
    ssr: false, // Disable SSR for recharts (reduces server bundle size)
  }
);

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

interface LazyStockChartProps {
  stockPrices: StockPrice[];
  news: News[];
}

export function LazyStockChart({ stockPrices, news }: LazyStockChartProps) {
  return <StockChart stockPrices={stockPrices} news={news} />;
}

