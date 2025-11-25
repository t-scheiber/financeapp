"use client";

import { memo, useMemo } from "react";

interface StockPrice {
  id: number;
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number;
}

interface PriceHistoryListProps {
  stockPrices: StockPrice[];
  maxItems?: number;
}

// Memoized individual price item to prevent re-renders
const PriceItem = memo(function PriceItem({ price }: { price: StockPrice }) {
  const dayChange =
    price.open && price.close ? price.close - price.open : null;

  const formattedDate = useMemo(
    () => new Date(price.date).toLocaleDateString(),
    [price.date]
  );

  return (
    <div className="rounded-xl border p-3 transition-colors hover:bg-muted/50 dark:hover:bg-muted/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground sm:text-sm">
          {formattedDate}
        </span>
        <span className="text-base font-bold sm:text-lg">
          ${price.close.toFixed(2)}
        </span>
      </div>
      <div className="flex flex-col gap-1 text-xs text-muted-foreground/80 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {price.open && <span>Open: ${price.open.toFixed(2)}</span>}
          {price.high && <span>High: ${price.high.toFixed(2)}</span>}
          {price.low && <span>Low: ${price.low.toFixed(2)}</span>}
        </div>
        {dayChange !== null && (
          <span
            className={`font-semibold ${
              dayChange > 0
                ? "text-accent"
                : dayChange < 0
                  ? "text-destructive"
                  : "text-muted-foreground"
            }`}
          >
            {dayChange > 0 ? "+" : ""}
            {dayChange.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
});

export const PriceHistoryList = memo(function PriceHistoryList({
  stockPrices,
  maxItems = 30,
}: PriceHistoryListProps) {
  const displayPrices = useMemo(
    () => stockPrices.slice(0, maxItems),
    [stockPrices, maxItems]
  );

  if (displayPrices.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No price history available
      </p>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {displayPrices.map((price) => (
        <PriceItem key={price.id} price={price} />
      ))}
    </div>
  );
});

