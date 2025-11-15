"use client";

import { clsx } from "clsx";
import {
  BarChart3,
  Building2,
  Loader2,
  Newspaper,
  PiggyBank,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const DASHBOARD_SKELETON_KEYS = [
  "dashboard-skeleton-1",
  "dashboard-skeleton-2",
  "dashboard-skeleton-3",
  "dashboard-skeleton-4",
  "dashboard-skeleton-5",
  "dashboard-skeleton-6",
];

interface Company {
  id: number;
  name: string;
  symbol: string;
  isin?: string | null;
  sector?: string;
  industry?: string;
  description?: string;
  _count: {
    stockPrices: number;
    dividends: number;
    news: number;
  };
}

interface StockPrice {
  id: number;
  companyId: number;
  date: string;
  open?: number;
  close: number;
}

export function Dashboard() {
  const { data: session, isPending } = useSession();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [latestPrices, setLatestPrices] = useState<
    Map<number, StockPrice | null>
  >(new Map());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const companiesRes = await fetch("/api/companies");

      if (!companiesRes.ok) {
        throw new Error("Failed to load companies");
      }

      const companiesData: Company[] = await companiesRes.json();
      setCompanies(companiesData);

      const pricesMap = new Map<number, StockPrice | null>();
      await Promise.all(
        companiesData.map(async (company) => {
          try {
            const priceRes = await fetch(
              `/api/stock-prices?companyId=${company.id}`,
            );
            if (!priceRes.ok) {
              pricesMap.set(company.id, null);
              return;
            }
            const prices: StockPrice[] = await priceRes.json();
            pricesMap.set(company.id, prices[0] || null);
          } catch (error) {
            console.error(`Error fetching price for ${company.name}:`, error);
            pricesMap.set(company.id, null);
          }
        }),
      );
      setLatestPrices(pricesMap);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [session, fetchData]);

  const summary = useMemo(() => {
    const totalCompanies = companies.length;
    const totals = companies.reduce(
      (acc, company) => ({
        prices: acc.prices + company._count.stockPrices,
        dividends: acc.dividends + company._count.dividends,
        news: acc.news + company._count.news,
      }),
      { prices: 0, dividends: 0, news: 0 },
    );

    const positiveMoves = Array.from(latestPrices.values()).filter((price) => {
      if (!price || price.open === undefined) return false;
      return price.close > price.open;
    }).length;

    return {
      totalCompanies,
      pricePoints: totals.prices,
      dividendsTracked: totals.dividends,
      newsSignals: totals.news,
      positiveMoves,
    };
  }, [companies, latestPrices]);

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

  if (isPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" aria-hidden />
        <span className="sr-only">Checking session</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-[420px] items-center justify-center px-4">
        <div className="glass-panel max-w-lg rounded-3xl p-10 text-center shadow-xl">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Sign in to explore your markets
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Access a personalised dashboard with live pricing, dividend history,
            and curated news signals for your watchlist.
          </p>
          <Button asChild className="mt-6 shadow-md shadow-accent/20">
            <Link href="/auth/signin">Sign in to continue</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <section className="glass-panel relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-lg">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_var(--aurora-x,60%)_-20%,color-mix(in_oklch,var(--accent)_18%,transparent),transparent_60%)] opacity-70"
        />
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
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
              automatically every three hours.
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-4 rounded-2xl border border-accent/20 bg-card/75 p-4 text-sm text-muted-foreground shadow-sm backdrop-blur sm:max-w-sm sm:grid-cols-2 dark:bg-card/60">
            <div className="flex flex-col gap-1 rounded-xl bg-accent/12 p-3 text-foreground transition sm:p-4">
              <span className="text-xs uppercase tracking-wide opacity-70">
                Tracked companies
              </span>
              <span className="text-2xl font-semibold">
                {summary.totalCompanies}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl bg-muted/60 p-3 sm:p-4">
              <span className="text-xs uppercase tracking-wide opacity-70">
                Positive moves today
              </span>
              <span className="text-xl font-semibold text-foreground">
                {summary.positiveMoves}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl bg-muted/60 p-3 sm:p-4">
              <span className="text-xs uppercase tracking-wide opacity-70">
                Price points ingested
              </span>
              <span className="text-xl font-semibold text-foreground">
                {summary.pricePoints.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl bg-muted/60 p-3 sm:p-4">
              <span className="text-xs uppercase tracking-wide opacity-70">
                News signals
              </span>
              <span className="text-xl font-semibold text-foreground">
                {summary.newsSignals.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="market-overview-heading" className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h2
              id="market-overview-heading"
              className="text-lg font-semibold text-foreground sm:text-xl"
            >
              Your coverage
            </h2>
            <p className="text-sm text-muted-foreground">
              Tap into company-level detail with price history, dividends, and
              news sentiment.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:min-w-[320px] lg:justify-end lg:gap-4">
            <div className="order-1 flex w-full flex-col gap-2 sm:order-2 sm:max-w-xs lg:max-w-sm">
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
            <div className="order-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:order-1 sm:justify-end">
              <div className="flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5" />
                <span>
                  {summary.pricePoints.toLocaleString()} price records
                </span>
              </div>
              <div className="flex items-center gap-1">
                <PiggyBank className="h-3.5 w-3.5" />
                <span>
                  {summary.dividendsTracked.toLocaleString()} dividend events
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Newspaper className="h-3.5 w-3.5" />
                <span>
                  {summary.newsSignals.toLocaleString()} sentiment articles
                </span>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {DASHBOARD_SKELETON_KEYS.map((skeletonKey) => (
              <div
                key={skeletonKey}
                className="interactive-card h-48 animate-pulse rounded-3xl bg-card/60 dark:bg-card/40"
              />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <Card className="glass-panel flex flex-col items-center justify-center rounded-3xl p-10 text-center shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-accent">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              No companies added yet
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              As soon as companies are tracked they will appear here with live
              pricing and intelligence.
            </p>
          </Card>
        ) : visibleCount === 0 ? (
          <Card className="glass-panel flex flex-col items-center justify-center rounded-3xl p-10 text-center shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-accent">
              <Search className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              No matches found
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn&apos;t find any companies matching "
              <span className="font-medium text-foreground">
                {searchTerm.trim()}
              </span>
              ". Try a different name, ticker, or ISIN.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm("")}
              className="mt-4"
            >
              Clear search
            </Button>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCompanies.map((company, index) => {
              const latestPrice = latestPrices.get(company.id);
              const priceChange =
                latestPrice?.open !== undefined &&
                latestPrice?.close !== undefined
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
                            {latestPrice
                              ? `$${latestPrice.close.toFixed(2)}`
                              : "Pending"}
                          </p>
                          {latestPrice ? (
                            <p className="text-xs text-muted-foreground">
                              {new Date(latestPrice.date).toLocaleDateString()}
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
                            {company._count.stockPrices}
                          </dd>
                        </div>
                        <div className="rounded-2xl border border-border/40 bg-card/70 p-3 dark:bg-card/50">
                          <dt className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-foreground/80">
                            <PiggyBank className="h-3 w-3" />
                            Dividends
                          </dt>
                          <dd className="mt-1 text-sm font-semibold text-foreground">
                            {company._count.dividends}
                          </dd>
                        </div>
                        <div className="col-span-2 rounded-2xl border border-border/40 bg-card/70 p-3 sm:col-span-1 dark:bg-card/50">
                          <dt className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-foreground/80">
                            <Newspaper className="h-3 w-3" />
                            News
                          </dt>
                          <dd className="mt-1 text-sm font-semibold text-foreground">
                            {company._count.news}
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
  );
}
