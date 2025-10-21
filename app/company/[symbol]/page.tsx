"use client";

import {
  ArrowLeft,
  Building2,
  DollarSign,
  Info,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
} from "recharts";
import { useFeatureToggles } from "@/components/feature-toggle-provider";
import { StockChart } from "@/components/stock-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Company {
  id: number;
  name: string;
  symbol: string;
  isin?: string | null;
  sector?: string;
  industry?: string;
  description?: string;
}

interface StockPrice {
  id: number;
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number;
}

interface Dividend {
  exDividendDate: string;
  paymentDate?: string;
  amount: number;
  currency: string;
}

interface News {
  id: number;
  title: string;
  summary?: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment?: string;
}

interface ForecastPoint {
  date: string;
  predictedPrice: number;
  confidence: number;
  method: string;
}

interface MarketComparison {
  companyReturn: number;
  marketReturns: Record<string, number>;
  outperformers: string[];
  underperformers: string[];
}

interface MarketIndexSummary {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
}

// Helper function to get sentiment badge styling
function getSentimentStyle(sentiment?: string) {
  switch (sentiment) {
    case "positive":
      return "bg-green-100 text-green-700 border-green-300";
    case "negative":
      return "bg-red-100 text-red-700 border-red-300";
    case "neutral":
      return "bg-gray-100 text-gray-700 border-gray-300";
    default:
      return "bg-gray-100 text-gray-600 border-gray-300";
  }
}

function getSentimentIcon(sentiment?: string) {
  switch (sentiment) {
    case "positive":
      return "😊";
    case "negative":
      return "😟";
    case "neutral":
      return "😐";
    default:
      return "";
  }
}

export default function CompanyPage({
  params,
}: {
  params: { symbol: string };
}) {
  const { toggles: featureToggles } = useFeatureToggles();
  const [company, setCompany] = useState<Company | null>(null);
  const [stockPrices, setStockPrices] = useState<StockPrice[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [dividendsLoading, setDividendsLoading] = useState(false);
  const [dividendsError, setDividendsError] = useState<string | null>(null);
  const [dividendsLoaded, setDividendsLoaded] = useState(false);
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<ForecastPoint[] | null>(null);
  const [sentimentForecast, setSentimentForecast] = useState<
    ForecastPoint[] | null
  >(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [forecastConfidence, setForecastConfidence] = useState<number | null>(
    null,
  );
  const [forecastLoading, setForecastLoading] = useState(false);
  const [marketInsights, setMarketInsights] = useState<MarketComparison | null>(
    null,
  );
  const [marketIndices, setMarketIndices] = useState<MarketIndexSummary[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [showForecast, setShowForecast] = useState(false);
  const forecastingEnabled = featureToggles.forecasting;
  const marketComparisonsEnabled = featureToggles.marketComparisons;
  const sentimentSignalsEnabled = featureToggles.sentimentSignals;
  const formatCurrency = (value: number) =>
    Number.isFinite(value) ? `$${value.toFixed(2)}` : "$0.00";
  const formatPercent = (value: number) =>
    `${Number.isFinite(value) ? (value * 100).toFixed(2) : "0.00"}%`;

  const handleLoadDividends = useCallback(async () => {
    if (!company) {
      return;
    }

    setDividendsLoading(true);
    setDividendsError(null);

    try {
      const response = await fetch(`/api/companies/${company.id}/dividends`);

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const errorMessage =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : "Failed to load dividends.";
        setDividendsError(errorMessage);
        return;
      }

      const body = (await response.json()) as {
        dividends?: Array<{
          exDividendDate?: string;
          paymentDate?: string | null;
          amount?: number | string;
          currency?: string;
        }>;
      };

      const normalisedDividends: Dividend[] = Array.isArray(body?.dividends)
        ? body.dividends
            .reduce<Dividend[]>((acc, entry) => {
              if (!entry?.exDividendDate) {
                return acc;
              }

              const exDate = new Date(entry.exDividendDate);
              if (Number.isNaN(exDate.getTime())) {
                return acc;
              }

              let amountValue: number;
              if (typeof entry.amount === "number") {
                amountValue = entry.amount;
              } else if (typeof entry.amount === "string") {
                amountValue = Number.parseFloat(entry.amount);
              } else {
                amountValue = Number.NaN;
              }

              const paymentDateValue =
                entry.paymentDate && typeof entry.paymentDate === "string"
                  ? new Date(entry.paymentDate)
                  : null;

              const paymentDate =
                paymentDateValue && !Number.isNaN(paymentDateValue.getTime())
                  ? paymentDateValue.toISOString()
                  : undefined;

              acc.push({
                exDividendDate: exDate.toISOString(),
                paymentDate,
                amount: Number.isFinite(amountValue) ? amountValue : 0,
                currency:
                  typeof entry.currency === "string" &&
                  entry.currency.trim().length > 0
                    ? entry.currency
                    : "USD",
              });
              return acc;
            }, [])
            .sort(
              (a, b) =>
                new Date(b.exDividendDate).getTime() -
                new Date(a.exDividendDate).getTime(),
            )
        : [];

      setDividends(normalisedDividends);
      setDividendsLoaded(true);
    } catch (error) {
      console.error("Error loading dividends:", error);
      setDividendsError("Unexpected error fetching dividends.");
    } finally {
      setDividendsLoading(false);
    }
  }, [company]);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        // Fetch company info
        const companiesRes = await fetch("/api/companies");
        if (!companiesRes.ok) throw new Error("Failed to fetch companies");

        const companies: Company[] = await companiesRes.json();
        const foundCompany = companies.find(
          (c) => c.symbol === params.symbol.toUpperCase(),
        );

        if (!foundCompany) {
          setError("Company not found");
          setLoading(false);
          return;
        }

        setCompany(foundCompany);
        setDividends([]);
        setDividendsLoaded(false);
        setDividendsError(null);
        setDividendsLoading(false);

        // Fetch stock prices
        const pricesRes = await fetch(
          `/api/stock-prices?companyId=${foundCompany.id}`,
        );
        if (pricesRes.ok) {
          const pricesData = await pricesRes.json();
          setStockPrices(pricesData);
        }

        // Fetch news
        const newsRes = await fetch(`/api/news?companyId=${foundCompany.id}`);
        if (newsRes.ok) {
          const newsData = await newsRes.json();
          setNews(newsData);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching company data:", err);
        setError("Failed to load company data");
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [params.symbol]);

  useEffect(() => {
    const companyId = company?.id;
    if (!companyId) {
      setForecast(null);
      setSentimentForecast(null);
      setForecastConfidence(null);
      setForecastError(null);
      setForecastLoading(false);
      setMarketInsights(null);
      setMarketIndices([]);
      setMarketError(null);
      setMarketLoading(false);
      return;
    }

    const shouldFetchForecast = featureToggles.forecasting;
    const shouldFetchMarket = featureToggles.marketComparisons;

    if (!shouldFetchForecast && !shouldFetchMarket) {
      setForecast(null);
      setSentimentForecast(null);
      setForecastConfidence(null);
      setForecastError(null);
      setForecastLoading(false);
      setMarketInsights(null);
      setMarketIndices([]);
      setMarketError(null);
      setMarketLoading(false);
      return;
    }

    const fetchForecastData = async () => {
      if (shouldFetchForecast) {
        setForecastLoading(true);
        setForecastError(null);
      } else {
        setForecastLoading(false);
      }

      if (shouldFetchMarket) {
        setMarketLoading(true);
        setMarketError(null);
      } else {
        setMarketLoading(false);
      }

      try {
        const response = await fetch(`/api/companies/${companyId}/forecast`);

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          const errorMessage =
            typeof body?.error === "string"
              ? body.error
              : "Failed to load analytics.";

          if (shouldFetchForecast) {
            setForecastError(errorMessage);
            setForecast([]);
            setSentimentForecast(null);
            setForecastConfidence(null);
          }
          if (shouldFetchMarket) {
            setMarketError(errorMessage);
            setMarketInsights(null);
            setMarketIndices([]);
          }
          return;
        }

        const body = (await response.json()) as {
          forecast?: ForecastPoint[];
          sentimentForecast?: ForecastPoint[];
          marketInsights?: MarketComparison | null;
          marketIndices?: MarketIndexSummary[];
        };

        if (shouldFetchForecast) {
          const nextForecast = body?.forecast ?? [];
          setForecast(nextForecast);
          setSentimentForecast(body?.sentimentForecast ?? null);
          setForecastConfidence(
            nextForecast.length > 0
              ? (nextForecast[0]?.confidence ?? null)
              : null,
          );
          setForecastError(null);
        } else {
          setForecast(null);
          setSentimentForecast(null);
          setForecastConfidence(null);
        }

        if (shouldFetchMarket) {
          setMarketInsights(body?.marketInsights ?? null);
          setMarketIndices(body?.marketIndices ?? []);
          setMarketError(null);
        } else {
          setMarketInsights(null);
          setMarketIndices([]);
        }
      } catch (err) {
        console.error("Error loading forecast and market data:", err);
        if (shouldFetchForecast) {
          setForecastError("Unexpected error loading forecast data.");
          setForecast([]);
          setSentimentForecast(null);
          setForecastConfidence(null);
        }
        if (shouldFetchMarket) {
          setMarketError("Unexpected error loading market insights.");
          setMarketInsights(null);
          setMarketIndices([]);
        }
      } finally {
        setForecastLoading(false);
        setMarketLoading(false);
      }
    };

    void fetchForecastData();
  }, [
    company?.id,
    featureToggles.forecasting,
    featureToggles.marketComparisons,
  ]);

  useEffect(() => {
    if (!featureToggles.forecasting) {
      setShowForecast(false);
    }
  }, [featureToggles.forecasting]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="text-center py-12">
          <p className="text-red-600 text-lg">{error || "Company not found"}</p>
        </div>
      </div>
    );
  }

  const latestPrice = stockPrices[0];
  const priceChange =
    latestPrice?.open && latestPrice?.close
      ? latestPrice.close - latestPrice.open
      : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Back Button */}
      <Link href="/">
        <Button variant="outline" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>

      {/* Company Header */}
      <div className="mb-8">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1 text-base">
              {company.symbol}
            </Badge>
            {company.isin ? (
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-[0.35rem] text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                {company.isin}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>
            <span className="font-medium">Sector:</span>{" "}
            {company.sector || "N/A"}
          </span>
          <span>•</span>
          <span>
            <span className="font-medium">Industry:</span>{" "}
            {company.industry || "N/A"}
          </span>
        </div>
        {company.description && (
          <p className="mt-3 text-gray-700">{company.description}</p>
        )}
      </div>

      {forecastingEnabled ? (
        <Card className="mb-8">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span>5-day forecast</span>
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                    >
                      <Info className="h-3.5 w-3.5" />
                      <span className="sr-only">Forecast details</span>
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent className="max-w-sm text-xs text-muted-foreground">
                    <p className="text-sm font-semibold text-foreground">
                      Trend projection with confidence
                    </p>
                    <p className="mt-2">
                      A simple linear regression on the last 90 trading days
                      gives us a trend line. The sparkline extrapolates the next
                      five sessions, and the confidence score reflects how well
                      the line fits the historical data (R²).
                    </p>
                  </HoverCardContent>
                </HoverCard>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Toggle the sparkline to preview projected closes for the next
                five sessions.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForecast((prev) => !prev)}
              disabled={
                forecastLoading ||
                !!forecastError ||
                !forecast ||
                forecast.length === 0
              }
            >
              {forecastLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : showForecast ? (
                "Hide sparkline"
              ) : (
                "Show sparkline"
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {forecastError ? (
              <p className="text-sm text-red-500">{forecastError}</p>
            ) : forecastLoading ? (
              <div className="h-32 animate-pulse rounded-xl bg-muted" />
            ) : !forecast || forecast.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Not enough recent price history to generate a forecast yet.
              </p>
            ) : (
              <div className="space-y-4">
                {showForecast ? (
                  <div className="h-48 w-full overflow-hidden rounded-xl border border-border/60 bg-white/70 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecast}>
                        <defs>
                          <linearGradient
                            id="forecastGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#2563eb"
                              stopOpacity={0.35}
                            />
                            <stop
                              offset="95%"
                              stopColor="#2563eb"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          stroke="hsl(215.4 16.3% 46.9%)"
                        />
                        <RechartsTooltip
                          formatter={(value: number) => [
                            formatCurrency(value as number),
                            "Projected close",
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="predictedPrice"
                          stroke="#2563eb"
                          strokeWidth={2}
                          fill="url(#forecastGradient)"
                          activeDot={{ r: 4 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <div>
                    Confidence:{" "}
                    <span className="font-semibold text-foreground">
                      {forecastConfidence !== null
                        ? `${Math.round(forecastConfidence * 100)}%`
                        : "n/a"}
                    </span>
                  </div>
                  <div className="hidden h-3 w-px bg-border sm:block" />
                  <div className="flex flex-wrap gap-3">
                    {forecast.map((point) => (
                      <div
                        key={point.date}
                        className="rounded-full border border-border/60 bg-white px-3 py-1 text-xs font-medium text-foreground shadow-sm"
                      >
                        {new Date(point.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                        : {formatCurrency(point.predictedPrice)}
                      </div>
                    ))}
                  </div>
                </div>
                {sentimentForecast && sentimentForecast.length > 0 ? (
                  <div className="rounded-2xl border border-border/40 bg-white/80 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Sentiment overlay
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {sentimentForecast.slice(0, 3).map((point) => (
                        <span
                          key={`sentiment-${point.date}`}
                          className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-white px-3 py-1 text-xs"
                        >
                          <span className="font-semibold text-foreground">
                            {new Date(point.date).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </span>
                          <span className="text-muted-foreground">
                            {formatCurrency(point.predictedPrice)}
                          </span>
                          <span className="text-muted-foreground">
                            {Math.round(point.confidence * 100)}%
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {marketComparisonsEnabled ? (
        <Card className="mb-8">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span>Market comparison</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                    >
                      <Info className="h-3.5 w-3.5" />
                      <span className="sr-only">Market comparison help</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm text-xs text-muted-foreground">
                    Trailing 30-day returns are calculated from stored price
                    history. We also surface the latest index levels and
                    highlight where the company outperformed or lagged.
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Contrast the company&apos;s trailing performance with tracked
                indices.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {marketError ? (
              <p className="text-sm text-red-500">{marketError}</p>
            ) : marketLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "market-skeleton-1",
                  "market-skeleton-2",
                  "market-skeleton-3",
                  "market-skeleton-4",
                ].map((key) => (
                  <div key={key} className="skeleton h-16 rounded-xl" />
                ))}
              </div>
            ) : marketInsights ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <div className="rounded-xl border border-border/50 bg-white px-3 py-2">
                    <span className="font-semibold text-foreground">
                      Company
                    </span>{" "}
                    <span
                      className={
                        marketInsights.companyReturn >= 0
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }
                    >
                      {formatPercent(marketInsights.companyReturn)}
                    </span>
                  </div>
                  {Object.entries(marketInsights.marketReturns).map(
                    ([symbol, value]) => (
                      <div
                        key={symbol}
                        className="rounded-xl border border-border/50 bg-white px-3 py-2"
                      >
                        <span className="font-semibold text-foreground">
                          {symbol}
                        </span>{" "}
                        <span
                          className={
                            value >= 0 ? "text-emerald-600" : "text-rose-600"
                          }
                        >
                          {formatPercent(value)}
                        </span>
                      </div>
                    ),
                  )}
                </div>
                {marketIndices.length > 0 ? (
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {marketIndices.map((index) => (
                      <div
                        key={index.symbol}
                        className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-white px-3 py-1"
                      >
                        <span className="font-semibold text-foreground">
                          {index.symbol}
                        </span>
                        <span>{formatCurrency(index.currentPrice)}</span>
                        <span
                          className={
                            index.change >= 0
                              ? "text-emerald-600 font-semibold"
                              : "text-rose-600 font-semibold"
                          }
                        >
                          {formatCurrency(index.change)} (
                          {index.changePercent.toFixed(2)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/40 bg-white/80 p-3 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">
                      Outperformers
                    </p>
                    {marketInsights.outperformers.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {marketInsights.outperformers.map((symbol) => (
                          <span
                            key={`out-${symbol}`}
                            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700"
                          >
                            {symbol}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2">
                        No indices beaten in the selected window.
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border border-border/40 bg-white/80 p-3 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">
                      Underperformers
                    </p>
                    {marketInsights.underperformers.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {marketInsights.underperformers.map((symbol) => (
                          <span
                            key={`under-${symbol}`}
                            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-semibold text-rose-600"
                          >
                            {symbol}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2">
                        No indices outpaced the company in this window.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                We&apos;ll surface comparisons once sufficient market data is
                available.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Latest Price Highlight */}
      {latestPrice ? (
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Current Price</p>
                <p className="text-4xl font-bold text-gray-900">
                  ${latestPrice.close.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(latestPrice.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              {priceChange !== null && (
                <div
                  className={`text-right ${
                    priceChange > 0
                      ? "text-green-600"
                      : priceChange < 0
                        ? "text-red-600"
                        : "text-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-end space-x-2 mb-1">
                    {priceChange > 0 ? (
                      <TrendingUp className="w-6 h-6" />
                    ) : priceChange < 0 ? (
                      <TrendingDown className="w-6 h-6" />
                    ) : null}
                    <span className="text-3xl font-bold">
                      {priceChange > 0 ? "+" : ""}
                      {priceChange.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm">
                    {((priceChange / (latestPrice.open || 1)) * 100).toFixed(2)}
                    %
                  </p>
                </div>
              )}
            </div>
            {latestPrice.volume && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Volume:{" "}
                  <span className="font-semibold">
                    {latestPrice.volume.toLocaleString()}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Stock Price Chart with Sentiment */}
      {stockPrices.length > 0 ? (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <StockChart stockPrices={stockPrices} news={news} />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stock Price History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>Price History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stockPrices.length > 0 ? (
              <div className="space-y-3">
                {stockPrices.slice(0, 30).map((price) => {
                  const dayChange =
                    price.open && price.close ? price.close - price.open : null;
                  return (
                    <div
                      key={price.id}
                      className="p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">
                          {new Date(price.date).toLocaleDateString()}
                        </span>
                        <span className="text-lg font-bold">
                          ${price.close.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="space-x-3">
                          {price.open && (
                            <span>Open: ${price.open.toFixed(2)}</span>
                          )}
                          {price.high && (
                            <span>High: ${price.high.toFixed(2)}</span>
                          )}
                          {price.low && (
                            <span>Low: ${price.low.toFixed(2)}</span>
                          )}
                        </div>
                        {dayChange !== null && (
                          <span
                            className={`font-semibold ${
                              dayChange > 0
                                ? "text-green-600"
                                : dayChange < 0
                                  ? "text-red-600"
                                  : "text-gray-600"
                            }`}
                          >
                            {dayChange > 0 ? "+" : ""}
                            {dayChange.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No price history available
              </p>
            )}
          </CardContent>
        </Card>

        {/* News */}
        <Card>
          <CardHeader>
            <CardTitle>Latest News</CardTitle>
          </CardHeader>
          <CardContent>
            {news.length > 0 ? (
              <div className="space-y-4">
                {news.map((article) => (
                  <div
                    key={article.id}
                    className="p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-sm leading-tight flex-1">
                        {article.title}
                      </h3>
                      {sentimentSignalsEnabled && article.sentiment && (
                        <span
                          className={`ml-2 px-2 py-1 rounded-full text-xs font-medium border ${getSentimentStyle(article.sentiment)}`}
                        >
                          {getSentimentIcon(article.sentiment)}{" "}
                          {article.sentiment}
                        </span>
                      )}
                    </div>
                    {article.summary && (
                      <p className="text-xs text-gray-600 mb-3 line-clamp-3">
                        {article.summary}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span className="font-medium">{article.source}</span>
                      <span>
                        {new Date(article.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-xs text-blue-600"
                      onClick={() => window.open(article.url, "_blank")}
                    >
                      Read full article
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No news available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            Dividend History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <Info className="h-3.5 w-3.5" />
                  <span className="sr-only">Dividend data help</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm text-xs text-muted-foreground">
                Pulls recent payouts directly from Alpha Vantage when requested.
                We keep the list small to stay within free-tier limits.
              </TooltipContent>
            </Tooltip>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadDividends}
              disabled={dividendsLoading || !company}
            >
              {dividendsLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : dividendsLoaded ? (
                "Refresh"
              ) : (
                "Load dividends"
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {dividendsError ? (
            <p className="text-sm text-red-500">{dividendsError}</p>
          ) : dividendsLoading ? (
            <div className="space-y-3">
              {[
                "dividend-skeleton-1",
                "dividend-skeleton-2",
                "dividend-skeleton-3",
              ].map((key) => (
                <div key={key} className="skeleton h-12 rounded-lg" />
              ))}
            </div>
          ) : dividends.length > 0 ? (
            <div className="space-y-3">
              {dividends.map((dividend, index) => {
                const entryKey = `${dividend.exDividendDate}-${index}`;
                const amountDisplay = Number.isFinite(dividend.amount)
                  ? dividend.amount.toFixed(2)
                  : dividend.amount;
                return (
                  <div
                    key={entryKey}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-white/80 p-3"
                  >
                    <div>
                      <p className="font-semibold">
                        {amountDisplay} {dividend.currency}
                      </p>
                      <p className="text-xs text-gray-500">
                        Ex-dividend:{" "}
                        {new Date(dividend.exDividendDate).toLocaleDateString()}
                      </p>
                    </div>
                    {dividend.paymentDate ? (
                      <p className="text-xs text-gray-600">
                        Payment:{" "}
                        {new Date(dividend.paymentDate).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">
                        Payment date pending
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : dividendsLoaded ? (
            <p className="text-sm text-muted-foreground">
              No dividend payouts reported for the recent period.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Load dividends to retrieve the latest payout history for this
              company.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
