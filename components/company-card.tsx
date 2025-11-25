"use client";

import { memo, useMemo } from "react";
import { clsx } from "clsx";
import {
  BarChart3,
  Building2,
  Newspaper,
  PiggyBank,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export interface CompanyData {
  id: number;
  name: string;
  symbol: string;
  isin: string | null;
  sector: string | null;
  industry: string | null;
  description: string | null;
  counts: {
    stockPrices: number;
    dividends: number;
    news: number;
  };
  latestPrice: {
    date: string;
    open: number | null;
    close: number | null;
  } | null;
}

interface CompanyCardProps {
  company: CompanyData;
  index: number;
}

// Format date label with memoization
function formatDateLabel(value: string | Date | null | undefined) {
  if (!value) return null;
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export const CompanyCard = memo(function CompanyCard({
  company,
  index,
}: CompanyCardProps) {
  const latestPrice = company.latestPrice;
  const closeValue = latestPrice?.close ?? null;
  const openValue = latestPrice?.open ?? null;

  const priceChange = useMemo(() => {
    if (closeValue === null || openValue === null) return null;
    return closeValue - openValue;
  }, [closeValue, openValue]);

  const formattedDate = useMemo(
    () => formatDateLabel(latestPrice?.date),
    [latestPrice?.date]
  );

  const animationDelay = useMemo(
    () => `${Math.min(index * 30, 300)}ms`,
    [index]
  );

  return (
    <Link href={`/company/${company.symbol}`}>
      <Card
        className="group relative h-full overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur transition-all hover:border-accent/50 hover:shadow-md dark:bg-card/60 dark:hover:bg-card/80 animate-fade-in-up sm:p-6"
        style={{ animationDelay }}
      >
        <header className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent transition-transform group-hover:scale-105 sm:h-11 sm:w-11">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-foreground sm:text-lg">
                {company.name}
              </h3>
              {company.industry && (
                <p className="truncate text-xs text-muted-foreground">
                  {company.industry}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge
              variant="secondary"
              className="px-2.5 py-0.5 text-xs font-semibold"
            >
              {company.symbol}
            </Badge>
            {company.isin && (
              <span className="text-[10px] text-muted-foreground/70">
                {company.isin}
              </span>
            )}
          </div>
        </header>

        <div className="mt-6 flex flex-col gap-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/60 p-4 shadow-inner sm:flex-row sm:items-end sm:justify-between dark:bg-card/40">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Last close
              </span>
              <p className="text-2xl font-semibold text-foreground">
                {closeValue !== null ? `$${closeValue.toFixed(2)}` : "Pending"}
              </p>
              {latestPrice && (
                <p className="text-xs text-muted-foreground">
                  {formattedDate ?? "Pending"}
                </p>
              )}
            </div>
            {priceChange !== null && (
              <div
                className={clsx(
                  "flex items-center gap-1.5 text-sm font-semibold",
                  priceChange > 0
                    ? "text-accent"
                    : priceChange < 0
                      ? "text-destructive"
                      : "text-muted-foreground"
                )}
              >
                {priceChange > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : priceChange < 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : null}
                <span>
                  {priceChange > 0 ? "+" : ""}
                  {priceChange.toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground/60">
                  Intraday change
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-accent" />
              <span className="font-medium text-foreground">Price</span>
              <span>{company.counts.stockPrices}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <PiggyBank className="h-3.5 w-3.5 text-accent" />
              <span className="font-medium text-foreground">Dividend</span>
              <span>{company.counts.dividends}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Newspaper className="h-3.5 w-3.5 text-accent" />
              <span className="font-medium text-foreground">News</span>
              <span>{company.counts.news}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
});

