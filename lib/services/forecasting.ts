import { prisma } from "@/lib/db";

export interface ForecastPoint {
  date: string;
  predictedPrice: number;
  confidence: number;
  method: "linear" | "exponential" | "sentiment_weighted";
}

export interface MarketIndexData {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
}

/**
 * Simple linear regression forecasting based on historical prices
 */
export async function forecastPrices(
  companyId: number,
  daysAhead: number = 30,
): Promise<ForecastPoint[]> {
  try {
    // Get last 90 days of price data
    const stockPrices = await prisma.stockPrice.findMany({
      where: { companyId },
      orderBy: { date: "desc" },
      take: 90,
    });

    if (stockPrices.length < 7) {
      // Not enough data for forecasting
      return [];
    }

    const prices = stockPrices.reverse(); // Oldest first

    // Simple linear regression
    const n = prices.length;
    const x = prices.map((_, i) => i);
    const y = prices.map((p) => p.close);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + (yi - predicted) ** 2;
    }, 0);
    const ssTot = y.reduce((sum, yi) => sum + (yi - yMean) ** 2, 0);
    const rSquared = 1 - ssRes / ssTot;

    const confidence = Math.max(0, Math.min(1, rSquared));
    const lastDate = new Date(prices[prices.length - 1].date);

    // Generate forecasts
    const forecasts: ForecastPoint[] = [];

    for (let i = 1; i <= daysAhead; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);

      const predictedPrice = Math.max(0, slope * (n + i - 1) + intercept);

      forecasts.push({
        date: forecastDate.toISOString().split("T")[0],
        predictedPrice,
        confidence,
        method: "linear",
      });
    }

    return forecasts;
  } catch {
    return [];
  }
}

/**
 * Sentiment-weighted forecasting
 */
export async function forecastWithSentiment(
  companyId: number,
  daysAhead: number = 30,
): Promise<ForecastPoint[]> {
  try {
    // Get recent price and news data
    const [prices, news] = await Promise.all([
      prisma.stockPrice.findMany({
        where: { companyId },
        orderBy: { date: "desc" },
        take: 30,
      }),
      prisma.news.findMany({
        where: { companyId },
        orderBy: { publishedAt: "desc" },
        take: 20,
      }),
    ]);

    if (prices.length < 7 || news.length === 0) {
      return [];
    }

    // Calculate sentiment score for recent period
    const recentNews = news.slice(0, 10);
    const sentimentScores = recentNews.map((article) => {
      switch (article.sentiment) {
        case "positive":
          return 1;
        case "negative":
          return -1;
        default:
          return 0;
      }
    });

    const avgSentiment =
      sentimentScores.reduce((a: number, b: number) => a + b, 0) /
      sentimentScores.length;

    // Use sentiment to adjust linear forecast
    const linearForecasts = await forecastPrices(companyId, daysAhead);

    return linearForecasts.map((forecast) => ({
      ...forecast,
      predictedPrice: Math.max(
        0,
        forecast.predictedPrice * (1 + avgSentiment * 0.05),
      ), // 5% max adjustment
      confidence: Math.max(
        0.1,
        forecast.confidence * (0.8 + Math.abs(avgSentiment) * 0.2),
      ),
      method: "sentiment_weighted",
    }));
  } catch {
    return [];
  }
}

/**
 * Get market index data using stored price history.
 */
export async function getMarketIndices(): Promise<MarketIndexData[]> {
  try {
    const indices = await prisma.marketIndex.findMany({
      include: {
        prices: {
          orderBy: { date: "desc" },
          take: 2,
        },
      },
      orderBy: { symbol: "asc" },
    });

    return indices.map((index) => {
      const [latest, previous] = index.prices;

      const currentPrice = latest?.close ?? 0;
      const change = previous ? currentPrice - previous.close : 0;
      const changePercent =
        previous && previous.close !== 0 ? (change / previous.close) * 100 : 0;

      return {
        symbol: index.symbol,
        name: index.name,
        currentPrice,
        change,
        changePercent,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Compare company performance against market indices
 */
export async function compareWithMarket(
  companyId: number,
  daysBack: number = 30,
): Promise<{
  companyReturn: number;
  marketReturns: Record<string, number>;
  outperformers: string[];
  underperformers: string[];
}> {
  try {
    // Get company price data
    const companyPrices = await prisma.stockPrice.findMany({
      where: { companyId },
      orderBy: { date: "desc" },
      take: daysBack + 1,
    });

    if (companyPrices.length < 2) {
      return {
        companyReturn: 0,
        marketReturns: {},
        outperformers: [],
        underperformers: [],
      };
    }

    const companyReturn =
      (companyPrices[0].close - companyPrices[companyPrices.length - 1].close) /
      companyPrices[companyPrices.length - 1].close;

    const marketIndices = await prisma.marketIndex.findMany({
      include: {
        prices: {
          orderBy: { date: "desc" },
          take: daysBack + 1,
        },
      },
    });

    const marketReturns: Record<string, number> = {};
    const outperformers: string[] = [];
    const underperformers: string[] = [];

    for (const index of marketIndices) {
      if (index.prices.length < 2) {
        marketReturns[index.symbol] = 0;
        continue;
      }

      const indexReturn =
        (index.prices[0].close - index.prices[index.prices.length - 1].close) /
        index.prices[index.prices.length - 1].close;

      marketReturns[index.symbol] = indexReturn;

      if (companyReturn > indexReturn) {
        outperformers.push(index.symbol);
      } else if (companyReturn < indexReturn) {
        underperformers.push(index.symbol);
      }
    }

    return {
      companyReturn,
      marketReturns,
      outperformers,
      underperformers,
    };
  } catch {
    return {
      companyReturn: 0,
      marketReturns: {},
      outperformers: [],
      underperformers: [],
    };
  }
}

/**
 * Calculate portfolio statistics using historical price data.
 */
export function calculatePortfolioStats(
  holdings: Array<{
    symbol: string;
    weight: number;
    prices: Array<{ date: Date; close: number }>;
  }>,
) {
  if (holdings.length === 0) {
    return {
      totalValue: 0,
      expectedReturn: 0,
      variance: 0,
      volatility: 0,
      sharpeRatio: 0,
      weightSum: 0,
      observationCount: 0,
      meanReturns: {} as Record<string, number>,
    };
  }

  const originalWeightSum = holdings.reduce(
    (sum, holding) => sum + holding.weight,
    0,
  );

  const normalizedHoldings =
    originalWeightSum > 0
      ? holdings.map((holding) => ({
          ...holding,
          weight: holding.weight / originalWeightSum,
        }))
      : holdings.map((holding) => ({
          ...holding,
          weight: holding.weight,
        }));

  type ProcessedHolding = {
    symbol: string;
    weight: number;
    returns: number[];
    latestPrice: number;
    returnMap: Map<string, number>;
  };

  const meanReturns: Record<string, number> = {};

  const processedHoldings: ProcessedHolding[] = normalizedHoldings.map(
    (holding) => {
      const sortedPrices = holding.prices
        .map((price) => ({
          date: price.date instanceof Date ? price.date : new Date(price.date),
          close: price.close,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      const returns: number[] = [];
      const returnMap = new Map<string, number>();

      for (let i = 1; i < sortedPrices.length; i++) {
        const previousClose = sortedPrices[i - 1].close;
        const currentClose = sortedPrices[i].close;
        if (!Number.isFinite(previousClose) || previousClose === 0) continue;

        const dailyReturn = (currentClose - previousClose) / previousClose;
        const dateKey = sortedPrices[i].date.toISOString().split("T")[0];
        returns.push(dailyReturn);
        returnMap.set(dateKey, dailyReturn);
      }

      meanReturns[holding.symbol] =
        returns.length > 0
          ? returns.reduce((sum, value) => sum + value, 0) / returns.length
          : 0;

      const latestPrice =
        sortedPrices.length > 0
          ? sortedPrices[sortedPrices.length - 1].close
          : 0;

      return {
        symbol: holding.symbol,
        weight: holding.weight,
        returns,
        latestPrice,
        returnMap,
      };
    },
  );

  const totalValue = processedHoldings.reduce(
    (sum, holding) => sum + holding.weight * holding.latestPrice,
    0,
  );

  const observationCount = processedHoldings.reduce((min, holding) => {
    if (holding.returns.length === 0) {
      return min;
    }
    if (min === 0) {
      return holding.returns.length;
    }
    return Math.min(min, holding.returns.length);
  }, 0);

  const covarianceMatrix: Record<string, Record<string, number>> = {};
  for (const holding of processedHoldings) {
    covarianceMatrix[holding.symbol] = {};
  }

  const computeCovariance = (seriesA: number[], seriesB: number[]): number => {
    const length = Math.min(seriesA.length, seriesB.length);
    if (length < 2) {
      return 0;
    }
    const meanA =
      seriesA.reduce((sum, value) => sum + value, 0) / seriesA.length;
    const meanB =
      seriesB.reduce((sum, value) => sum + value, 0) / seriesB.length;

    let covariance = 0;
    const limit = Math.min(seriesA.length, seriesB.length);
    for (let i = 0; i < limit; i++) {
      covariance += (seriesA[i] - meanA) * (seriesB[i] - meanB);
    }
    return covariance / (limit - 1);
  };

  const computeCovarianceFromMaps = (
    mapA: Map<string, number>,
    mapB: Map<string, number>,
  ) => {
    const paired: Array<[number, number]> = [];
    for (const [date, valueA] of mapA.entries()) {
      const valueB = mapB.get(date);
      if (valueB !== undefined) {
        paired.push([valueA, valueB]);
      }
    }
    if (paired.length < 2) {
      return 0;
    }
    const valuesA = paired.map(([a]) => a);
    const valuesB = paired.map(([, b]) => b);
    return computeCovariance(valuesA, valuesB);
  };

  for (let i = 0; i < processedHoldings.length; i++) {
    for (let j = i; j < processedHoldings.length; j++) {
      const holdingA = processedHoldings[i];
      const holdingB = processedHoldings[j];

      const covariance =
        i === j
          ? computeCovariance(holdingA.returns, holdingA.returns)
          : computeCovarianceFromMaps(holdingA.returnMap, holdingB.returnMap);

      covarianceMatrix[holdingA.symbol][holdingB.symbol] = covariance;
      covarianceMatrix[holdingB.symbol][holdingA.symbol] = covariance;
    }
  }

  let variance = 0;
  for (const holdingA of processedHoldings) {
    for (const holdingB of processedHoldings) {
      const covariance =
        covarianceMatrix[holdingA.symbol][holdingB.symbol] ?? 0;
      variance += holdingA.weight * holdingB.weight * covariance;
    }
  }

  variance = Number.isFinite(variance) ? Math.max(variance, 0) : 0;
  const volatility = Math.sqrt(variance);

  const expectedReturn = processedHoldings.reduce(
    (sum, holding) => sum + holding.weight * (meanReturns[holding.symbol] ?? 0),
    0,
  );

  const sharpeRatio = volatility > 0 ? expectedReturn / volatility : 0;

  return {
    totalValue,
    expectedReturn,
    variance,
    volatility,
    sharpeRatio,
    weightSum: originalWeightSum,
    observationCount,
    meanReturns,
  };
}

export async function getPortfolioStats(portfolioId: string) {
  try {
    const holdings = await prisma.holding.findMany({
      where: { portfolioId },
      include: {
        company: {
          select: {
            symbol: true,
            stockPrices: {
              orderBy: { date: "desc" },
              take: 120,
            },
          },
        },
      },
    });

    if (holdings.length === 0) {
      return {
        stats: {
          totalValue: 0,
          expectedReturn: 0,
          variance: 0,
          volatility: 0,
          sharpeRatio: 0,
          weightSum: 0,
          observationCount: 0,
          meanReturns: {} as Record<string, number>,
        },
      };
    }

    const preparedHoldings = holdings.map((holding) => ({
      symbol: holding.company.symbol,
      weight: holding.weight,
      prices: holding.company.stockPrices.map((price) => ({
        date: price.date,
        close: price.close,
      })),
    }));

    const stats = calculatePortfolioStats(preparedHoldings);

    return { stats };
  } catch {
    return {
      stats: {
        totalValue: 0,
        expectedReturn: 0,
        variance: 0,
        volatility: 0,
        sharpeRatio: 0,
        weightSum: 0,
        observationCount: 0,
        meanReturns: {} as Record<string, number>,
      },
    };
  }
}
