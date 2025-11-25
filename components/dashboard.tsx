"use client";

import { clsx } from "clsx";
import {
  BarChart3,
  Building2,
  Clock3,
  Newspaper,
  PiggyBank,
  RefreshCcw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QuickStartGuideDialog } from "@/components/guide/quick-start-guide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QUICK_START_GUIDE_STEPS } from "@/lib/constants/guide";
import { CRON_INTERVAL_HOURS } from "@/lib/constants/limits";
import { toast } from "sonner";

export type DashboardCompany = {
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
};

type DashboardProps = {
  initialCompanies: DashboardCompany[];
  generatedAt?: string | null;
  initialGuideSeen?: boolean;
};

// Cron runs at fixed UTC times: 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00
const CRON_HOURS_UTC = [0, 3, 6, 9, 12, 15, 18, 21];
const stableTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
});
const stableDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

function formatIntervalLabel(hours: number): string {
  const rounded = Math.max(1, Math.round(hours));
  return `${rounded} hour${rounded === 1 ? "" : "s"}`;
}

/**
 * Calculate the next cron refresh time based on fixed UTC schedule.
 * Cron runs at: 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 UTC
 */
function computeNextRefresh(): string {
  const now = new Date();
  const currentHourUTC = now.getUTCHours();
  const currentMinuteUTC = now.getUTCMinutes();
  
  // Find the next cron hour
  let nextHour = CRON_HOURS_UTC.find(h => h > currentHourUTC);
  
  // If we're exactly at a cron hour but past minute 0, find the next one
  if (nextHour === undefined || (CRON_HOURS_UTC.includes(currentHourUTC) && currentMinuteUTC > 0)) {
    nextHour = CRON_HOURS_UTC.find(h => h > currentHourUTC);
  }
  
  // If current hour is a cron hour and we're at minute 0, that's now (or just passed)
  if (CRON_HOURS_UTC.includes(currentHourUTC) && currentMinuteUTC === 0) {
    nextHour = CRON_HOURS_UTC.find(h => h > currentHourUTC);
  }
  
  const nextDate = new Date(now);
  nextDate.setUTCSeconds(0, 0);
  nextDate.setUTCMinutes(0);
  
  if (nextHour !== undefined) {
    nextDate.setUTCHours(nextHour);
  } else {
    // Wrap to next day at 00:00 UTC
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    nextDate.setUTCHours(0);
  }
  
  return nextDate.toISOString();
}

function formatCountdown(target: string | null): string {
  if (!target) return "pending";
  const diff = new Date(target).getTime() - Date.now();
  if (Number.isNaN(diff)) return "pending";
  if (diff <= 0) return "due now";
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatTimestamp(value: string | Date | null | undefined) {
  if (!value) return null;
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    // Format as "3:00 AM UTC" style
    return `${stableTimeFormatter.format(date)} UTC`;
  } catch {
    return null;
  }
}

/**
 * Format the next cron time for display
 * Shows the fixed UTC time like "3:00 AM UTC"
 */
function formatNextCronTime(isoString: string | null): string | null {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return null;
    return `${stableTimeFormatter.format(date)} UTC`;
  } catch {
    return null;
  }
}

function formatDateLabel(value: string | Date | null | undefined) {
  if (!value) return null;
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return stableDateFormatter.format(date);
  } catch {
    return null;
  }
}

export function Dashboard({
  initialCompanies,
  generatedAt = null,
  initialGuideSeen = true,
}: DashboardProps) {
  const companies = initialCompanies;
  const [searchTerm, setSearchTerm] = useState("");
  const initialTimestamp = useMemo(
    () => generatedAt ?? new Date().toISOString(),
    [generatedAt],
  );
  const lastUpdated = initialTimestamp;
  // Calculate next cron time based on fixed UTC schedule
  const nextRefreshAt = useMemo(() => computeNextRefresh(), []);
  const [countdown, setCountdown] = useState<string>(() =>
    formatCountdown(nextRefreshAt),
  );
  const [guideDialogOpen, setGuideDialogOpen] = useState<boolean>(
    () => !initialGuideSeen,
  );
  const [guideSaving, setGuideSaving] = useState(false);

  // State to track the current next refresh time (recalculated when it passes)
  const [currentNextRefresh, setCurrentNextRefresh] = useState<string>(nextRefreshAt);

  useEffect(() => {
    if (!currentNextRefresh) {
      setCountdown("pending");
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const target = new Date(currentNextRefresh).getTime();
      
      // If we've passed the target, recalculate the next refresh time
      if (now >= target) {
        const newNext = computeNextRefresh();
        setCurrentNextRefresh(newNext);
        setCountdown(formatCountdown(newNext));
      } else {
        setCountdown(formatCountdown(currentNextRefresh));
      }
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [currentNextRefresh]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return "Fresh snapshot";
    const formatted = formatTimestamp(lastUpdated);
    return formatted ? `Updated ${formatted}` : "Fresh snapshot";
  }, [lastUpdated]);

  const formattedNextRefreshTime = useMemo(
    () => formatNextCronTime(currentNextRefresh),
    [currentNextRefresh],
  );

  const summary = useMemo(() => {
    const totalCompanies = companies.length;
    const totals = companies.reduce(
      (acc, company) => ({
        prices: acc.prices + company.counts.stockPrices,
        dividends: acc.dividends + company.counts.dividends,
        news: acc.news + company.counts.news,
      }),
      { prices: 0, dividends: 0, news: 0 },
    );

    const positiveMoves = companies.filter((company) => {
      if (!company.latestPrice) return false;
      const { open, close } = company.latestPrice;
      if (open == null || close == null) return false;
      return close > open;
    }).length;

    return {
      totalCompanies,
      pricePoints: totals.prices,
      dividendsTracked: totals.dividends,
      newsSignals: totals.news,
      positiveMoves,
    };
  }, [companies]);

  const handleGuideFinish = useCallback(async () => {
    setGuideSaving(true);
    try {
      const response = await fetch("/api/user/preferences/guide", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hasSeenGuide: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to update guide preference.");
      }

      setGuideDialogOpen(false);
      toast.success("Quick start completed", {
        description: "Replay the tour anytime from Settings.",
      });
    } catch (error) {
      toast.error("Unable to save tour progress", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again in a moment.",
      });
    } finally {
      setGuideSaving(false);
    }
  }, []);

  const filteredCompanies = useMemo(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return companies;

    const term = trimmed.toLowerCase();
    const normalise = (value: string) =>
      value.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const normalisedTerm = normalise(trimmed);

    return companies.filter((company) => {
      const name = company.name?.toLowerCase() ?? "";
      const symbol = company.symbol?.toLowerCase() ?? "";
      const industry = company.industry?.toLowerCase() ?? "";
      const description = company.description?.toLowerCase() ?? "";
      const isin = company.isin ? normalise(company.isin) : "";

      return (
        name.includes(term) ||
        symbol.includes(term) ||
        industry.includes(term) ||
        description.includes(term) ||
        isin?.includes(normalisedTerm)
      );
    });
  }, [companies, searchTerm]);

  const hasSearch = searchTerm.trim().length > 0;
  const visibleCount = filteredCompanies.length;
  const coverageHighlights = useMemo(
    () => [
      {
        label: "Tracked companies",
        value: summary.totalCompanies.toLocaleString(),
        helper: "Included in this refresh window",
        icon: <Building2 className="h-4 w-4 text-accent" />,
      },
      {
        label: "Price records",
        value: summary.pricePoints.toLocaleString(),
        helper: "Historical datapoints stored",
        icon: <BarChart3 className="h-4 w-4 text-accent" />,
      },
      {
        label: "Dividend events",
        value: summary.dividendsTracked.toLocaleString(),
        helper: "Confirmed payouts on record",
        icon: <PiggyBank className="h-4 w-4 text-accent" />,
      },
      {
        label: "Sentiment articles",
        value: summary.newsSignals.toLocaleString(),
        helper: "Curated & analysed recently",
        icon: <Newspaper className="h-4 w-4 text-accent" />,
      },
      {
        label: "Positive moves today",
        value: summary.positiveMoves.toLocaleString(),
        helper: "Companies finishing in the green",
        icon: <TrendingUp className="h-4 w-4 text-green-500" />,
      },
      {
        label: "Auto refresh cadence",
        value: `${formatIntervalLabel(CRON_INTERVAL_HOURS)}`,
        helper: "Behind-the-scenes cron interval",
        icon: <RefreshCcw className="h-4 w-4 text-accent" />,
      },
    ],
    [summary],
  );

  return (
    <>
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <section className="glass-panel relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-lg">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_var(--aurora-x,60%)_-20%,color-mix(in_oklch,var(--accent)_18%,transparent),transparent_60%)] opacity-70"
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-start">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              Live market intelligence
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Monitor your portfolio at a glance
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Stay informed with sentiment, price movement, and dividend
              coverage tailored to the companies you follow. Updates arrive
              automatically every {formatIntervalLabel(CRON_INTERVAL_HOURS)}.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-accent/20 bg-card/75 p-3 text-sm text-muted-foreground shadow-sm backdrop-blur sm:gap-3 sm:p-4 lg:grid-cols-4 dark:bg-card/60">
              <div className="flex min-w-0 flex-col gap-1 rounded-xl bg-accent/12 p-2.5 text-foreground transition sm:p-3">
                <span className="text-[10px] uppercase tracking-wide opacity-70 sm:text-xs">
                  Tracked companies
                </span>
                <span className="text-xl font-semibold sm:text-2xl">
                  {summary.totalCompanies}
                </span>
              </div>
              <div className="flex min-w-0 flex-col gap-1 rounded-xl bg-muted/60 p-2.5 sm:p-3">
                <span className="text-[10px] uppercase tracking-wide opacity-70 sm:text-xs">
                  Positive moves
                </span>
                <span className="text-lg font-semibold text-foreground sm:text-xl">
                  {summary.positiveMoves}
                </span>
              </div>
              <div className="flex min-w-0 flex-col gap-1 rounded-xl bg-muted/60 p-2.5 sm:p-3">
                <span className="text-[10px] uppercase tracking-wide opacity-70 sm:text-xs">
                  Price points
                </span>
                <span className="text-lg font-semibold text-foreground sm:text-xl">
                  {summary.pricePoints.toLocaleString()}
                </span>
              </div>
              <div className="flex min-w-0 flex-col gap-1 rounded-xl bg-muted/60 p-2.5 sm:p-3">
                <span className="text-[10px] uppercase tracking-wide opacity-70 sm:text-xs">
                  News signals
                </span>
                <span className="text-lg font-semibold text-foreground sm:text-xl">
                  {summary.newsSignals.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-accent/20 bg-card/80 p-4 text-sm text-muted-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-start dark:bg-card/50">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  New here?
                </p>
                <p className="text-sm">
                  Replay the quick tour to see how everything fits together.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center sm:w-auto lg:w-full"
                onClick={() => setGuideDialogOpen(true)}
              >
                Replay quick tour
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="market-overview-heading" className="space-y-6">
        <Card className="glass-panel rounded-3xl border-none p-6 shadow-lg sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <div className="space-y-5">
              <div className="space-y-2">
                <h2
                  id="market-overview-heading"
                  className="text-lg font-semibold text-foreground sm:text-xl"
                >
                  Your coverage
                </h2>
                <p className="text-sm text-muted-foreground">
                  Tap into company-level detail with price history, dividends,
                  and news sentiment. These metrics reflect the latest server
                  snapshot.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
                {coverageHighlights.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-border/50 bg-card/80 p-3 sm:rounded-2xl sm:p-4 dark:bg-card/40"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/10 sm:h-9 sm:w-9 sm:rounded-2xl">
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                          {item.label}
                        </p>
                        <p className="text-base font-semibold text-foreground sm:text-lg">
                          {item.value}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground sm:mt-3 sm:text-xs">
                      {item.helper}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-center gap-5 rounded-2xl border border-border/50 bg-card/60 p-6 text-sm text-muted-foreground shadow-sm dark:bg-card/40 sm:p-8">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Search coverage
                </p>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setSearchTerm("");
                      }
                    }}
                    placeholder="Search name, ticker, or ISIN"
                    aria-label="Search companies by name, ticker, or ISIN"
                    spellCheck={false}
                    className="pl-9 pr-8 text-sm"
                  />
                  {hasSearch ? (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute inset-y-0 right-2 inline-flex items-center justify-center rounded-full p-1 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground sm:text-right">
                  Showing {visibleCount} of {summary.totalCompanies} companies
                </p>
              </div>
              <dl className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <dt className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Last refresh
                  </dt>
                  <dd className="text-muted-foreground">{lastUpdatedLabel}</dd>
                </div>
                <div className="flex items-start gap-2">
                  <dt className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    Next auto refresh
                  </dt>
                  <dd className="text-muted-foreground">
                    {countdown ? `in ${countdown}` : "in progress"}
                    {formattedNextRefreshTime
                      ? ` • ${formattedNextRefreshTime}`
                      : ""}
                  </dd>
                </div>
                <div className="flex items-start gap-2">
                  <dt className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                    Quick action
                  </dt>
                  <dd className="text-muted-foreground">
                    Need onboarding again?{" "}
                    <button
                      type="button"
                      onClick={() => setGuideDialogOpen(true)}
                      className="font-medium text-accent underline-offset-4 transition hover:underline"
                    >
                      Replay the tour
                    </button>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </Card>

        {companies.length === 0 ? (
          <Card className="glass-panel flex flex-col items-center justify-center rounded-3xl p-12 text-center shadow-lg animate-fade-in-up">
            <div className="mb-6 relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent">
                <BarChart3 className="h-10 w-10" />
              </div>
              <div className="absolute -inset-2 rounded-full bg-accent/5 animate-float-soft" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              No companies tracked yet
            </h3>
            <p className="mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
              Your personalized dashboard awaits! Add companies to your watchlist via the Settings page to see live pricing, dividends, and AI-powered sentiment coverage.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/settings">
                <Button className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Get started
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => setGuideDialogOpen(true)}
              >
                View quick tour
              </Button>
            </div>
          </Card>
        ) : visibleCount === 0 ? (
          <Card className="glass-panel flex flex-col items-center justify-center rounded-3xl p-10 text-center shadow-lg animate-fade-in-up">
            <div className="mb-5 relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Search className="h-7 w-7" aria-hidden="true" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              No matches found
            </h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              We couldn&apos;t find any companies matching{" "}
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">
                &quot;{searchTerm.trim()}&quot;
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Try a different name, ticker symbol, or ISIN
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchTerm("")}
              className="mt-5 gap-2"
            >
              <X className="h-3.5 w-3.5" />
              Clear search
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies.map((company, index) => {
              const latestPrice = company.latestPrice;
              const closeValue =
                typeof latestPrice?.close === "number" ? latestPrice.close : null;
              const priceChange =
                latestPrice?.open != null && latestPrice?.close != null
                  ? latestPrice.close - latestPrice.open
                  : null;
              const trendClass =
                priceChange !== null
                  ? priceChange > 0
                    ? "text-emerald-600"
                    : priceChange < 0
                      ? "text-rose-600"
                      : "text-muted-foreground"
                  : "text-muted-foreground";

              return (
                <Link
                  key={company.id}
                  href={`/company/${company.symbol}`}
                  className="outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <article
                    className="interactive-card animate-fade-in-up flex h-full flex-col justify-between rounded-3xl p-4 sm:p-5"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                          <Building2 className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">
                            {company.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {company.industry || "Diversified"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                        <Badge
                          variant="secondary"
                          className="text-xs sm:text-sm"
                        >
                          {company.symbol}
                        </Badge>
                        {company.isin ? (
                          <span className="rounded-full border border-border/60 bg-card/70 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground dark:bg-card/50">
                            {company.isin}
                          </span>
                        ) : null}
                      </div>
                    </header>

                    <div className="mt-6 flex flex-col gap-5">
                      <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/60 p-4 shadow-inner sm:flex-row sm:items-end sm:justify-between dark:bg-card/40">
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Last close
                          </span>
                          <p className="text-2xl font-semibold text-foreground">
                            {closeValue !== null
                              ? `$${closeValue.toFixed(2)}`
                              : "Pending"}
                          </p>
                          {latestPrice ? (
                            <p className="text-xs text-muted-foreground">
                              {formatDateLabel(latestPrice.date) ?? "Pending"}
                            </p>
                          ) : null}
                        </div>
                        {priceChange !== null ? (
                          <div
                            className={clsx(
                              "flex flex-col items-end gap-1 text-sm font-semibold",
                              trendClass,
                            )}
                          >
                            <span className="inline-flex items-center gap-1">
                              {priceChange > 0 ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : priceChange < 0 ? (
                                <TrendingDown className="h-4 w-4" />
                              ) : null}
                              {priceChange > 0 ? "+" : ""}
                              {priceChange.toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Intraday change
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Awaiting open price
                          </span>
                        )}
                      </div>

                      <dl className="grid grid-cols-2 gap-3 text-center text-xs text-muted-foreground sm:grid-cols-3">
                        <div className="rounded-2xl border border-border/40 bg-card/70 p-3 dark:bg-card/50">
                          <dt className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-foreground/80">
                            <BarChart3 className="h-3 w-3" />
                            Prices
                          </dt>
                          <dd className="mt-1 text-sm font-semibold text-foreground">
                            {company.counts.stockPrices}
                          </dd>
                        </div>
                        <div className="rounded-2xl border border-border/40 bg-card/70 p-3 dark:bg-card/50">
                          <dt className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-foreground/80">
                            <PiggyBank className="h-3 w-3" />
                            Dividends
                          </dt>
                          <dd className="mt-1 text-sm font-semibold text-foreground">
                            {company.counts.dividends}
                          </dd>
                        </div>
                        <div className="col-span-2 rounded-2xl border border-border/40 bg-card/70 p-3 sm:col-span-1 dark:bg-card/50">
                          <dt className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-foreground/80">
                            <Newspaper className="h-3 w-3" />
                            News
                          </dt>
                          <dd className="mt-1 text-sm font-semibold text-foreground">
                            {company.counts.news}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      </div>
      <QuickStartGuideDialog
        open={guideDialogOpen}
        steps={QUICK_START_GUIDE_STEPS}
        onOpenChange={setGuideDialogOpen}
        onFinish={handleGuideFinish}
        busy={guideSaving}
      />
    </>
  );
}
