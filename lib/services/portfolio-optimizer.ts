import type { InputJsonValue } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db";
import type { EfficientFrontierPoint } from "@/lib/services/portfolios";

export class OptimizerUserError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "OptimizerUserError";
    this.statusCode = statusCode;
  }
}

type ProcessedHolding = {
  symbol: string;
  returns: Array<{ date: string; value: number }>;
  returnMap: Map<string, number>;
};

const ensureDate = (value: Date | string) =>
  value instanceof Date ? value : new Date(value);

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
  const meanA = valuesA.reduce((sum, value) => sum + value, 0) / valuesA.length;
  const meanB = valuesB.reduce((sum, value) => sum + value, 0) / valuesB.length;
  let covariance = 0;
  for (let i = 0; i < paired.length; i++) {
    covariance += (valuesA[i] - meanA) * (valuesB[i] - meanB);
  }
  return covariance / (paired.length - 1);
};

const computeVariance = (values: number[]) => {
  if (values.length < 2) {
    return 0;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (values.length - 1);
  return Number.isFinite(variance) ? variance : 0;
};

const normaliseWeights = (weights: number[]) => {
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total === 0) {
    const equal = weights.length > 0 ? 1 / weights.length : 0;
    return weights.map(() => equal);
  }
  return weights.map((value) => value / total);
};

const toWeightObject = (
  symbols: string[],
  weights: number[],
): Record<string, number> => {
  const entries = symbols.map((symbol, index) => [
    symbol,
    Number.isFinite(weights[index]) ? weights[index] : 0,
  ]);
  return Object.fromEntries(entries);
};

const formatMissingSymbols = (held: string[], processed: string[]) => {
  const missing = held.filter((symbol) => !processed.includes(symbol));
  return missing.join(", ");
};

export async function buildEfficientFrontier(portfolioId: string): Promise<{
  maxSharpeWeights: Record<string, number>;
  minVarianceWeights: Record<string, number>;
  efficientFrontier: EfficientFrontierPoint[];
  calculatedAt: Date;
}> {
  const holdings = await prisma.holding.findMany({
    where: { portfolioId },
    include: {
      company: {
        select: {
          symbol: true,
          stockPrices: {
            orderBy: { date: "desc" },
            take: 180,
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (holdings.length < 2) {
    throw new OptimizerUserError(
      "Add at least two holdings before running the optimiser.",
    );
  }

  const processedHoldings: ProcessedHolding[] = holdings
    .map((holding) => {
      const sortedPrices = holding.company.stockPrices
        .map((price) => ({
          date: ensureDate(price.date),
          close: price.close,
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      if (sortedPrices.length < 45) {
        return null;
      }

      const returns: Array<{ date: string; value: number }> = [];
      const returnMap = new Map<string, number>();

      for (let i = 1; i < sortedPrices.length; i++) {
        const previous = sortedPrices[i - 1].close;
        const current = sortedPrices[i].close;
        if (!Number.isFinite(previous) || previous === 0) {
          continue;
        }
        const dailyReturn = (current - previous) / previous;
        const dateKey = sortedPrices[i].date.toISOString().split("T")[0];
        returns.push({ date: dateKey, value: dailyReturn });
        returnMap.set(dateKey, dailyReturn);
      }

      if (returns.length < 30) {
        return null;
      }

      return {
        symbol: holding.company.symbol,
        returns,
        returnMap,
      };
    })
    .filter((value): value is ProcessedHolding => value !== null);

  if (processedHoldings.length < holdings.length) {
    const missingSymbols = formatMissingSymbols(
      holdings.map((holding) => holding.company.symbol),
      processedHoldings.map((holding) => holding.symbol),
    );
    throw new OptimizerUserError(
      `Need more price history for ${missingSymbols} before building the frontier. Try another refresh after the next data pull.`,
    );
  }

  const assetSymbols = processedHoldings.map((holding) => holding.symbol);

  const meanReturns: Record<string, number> = {};
  processedHoldings.forEach((holding) => {
    const total = holding.returns.reduce(
      (sum, entry) => sum + entry.value,
      0,
    );
    meanReturns[holding.symbol] =
      holding.returns.length > 0 ? total / holding.returns.length : 0;
  });

  const covarianceMatrix: number[][] = [];
  for (let i = 0; i < processedHoldings.length; i++) {
    covarianceMatrix[i] = [];
    const variance = computeVariance(
      processedHoldings[i].returns.map((entry) => entry.value),
    );
    covarianceMatrix[i][i] = variance;
    for (let j = i + 1; j < processedHoldings.length; j++) {
      const covariance = computeCovarianceFromMaps(
        processedHoldings[i].returnMap,
        processedHoldings[j].returnMap,
      );
      covarianceMatrix[i][j] = covariance;
      covarianceMatrix[j][i] = covariance;
    }
  }

  const weightMap: Record<string, number> = {};
  holdings.forEach((holding) => {
    weightMap[holding.company.symbol] = holding.weight;
  });

  const totalHeldWeight = Object.values(weightMap).reduce(
    (sum, weight) => sum + weight,
    0,
  );

  const orderedBaseWeights = assetSymbols.map((symbol) => {
    const weight = weightMap[symbol] ?? 0;
    if (totalHeldWeight === 0) {
      return 1 / assetSymbols.length;
    }
    return weight / totalHeldWeight;
  });

  const computePortfolioMoments = (weights: number[]) => {
    const expectedReturn = weights.reduce((sum, weight, index) => {
      const symbol = assetSymbols[index];
      return sum + weight * (meanReturns[symbol] ?? 0);
    }, 0);

    let variance = 0;
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        variance += weights[i] * weights[j] * (covarianceMatrix[i][j] ?? 0);
      }
    }

    variance = Number.isFinite(variance) ? Math.max(variance, 0) : 0;
    const risk = Math.sqrt(variance);
    return { expectedReturn, risk };
  };

  const candidatePoints: EfficientFrontierPoint[] = [];

  const registerPoint = (weights: number[]) => {
    const { expectedReturn, risk } = computePortfolioMoments(weights);
    if (!Number.isFinite(expectedReturn) || !Number.isFinite(risk)) {
      return;
    }
    candidatePoints.push({
      risk,
      return: expectedReturn,
      weights: toWeightObject(assetSymbols, weights),
    });
  };

  if (orderedBaseWeights.some((weight) => weight > 0)) {
    registerPoint(normaliseWeights(orderedBaseWeights));
  }

  const sampleCount = Math.min(500, assetSymbols.length * 160);
  for (let i = 0; i < sampleCount; i++) {
    const weights = assetSymbols.map(() => Math.random());
    registerPoint(normaliseWeights(weights));
  }

  if (candidatePoints.length === 0) {
    throw new OptimizerUserError(
      "Unable to construct the efficient frontier. Please try again after a data refresh.",
    );
  }

  const sortedByRisk = [...candidatePoints].sort(
    (a, b) => a.risk - b.risk,
  );
  const efficientFrontier: EfficientFrontierPoint[] = [];
  let bestReturn = -Infinity;
  const epsilon = 1e-4;

  for (const point of sortedByRisk) {
    if (point.return >= bestReturn - epsilon) {
      efficientFrontier.push(point);
      bestReturn = Math.max(bestReturn, point.return);
    }
  }

  const trimmedFrontier = efficientFrontier.slice(0, 40);

  if (trimmedFrontier.length === 0) {
    throw new OptimizerUserError(
      "Efficient frontier results were empty. Add more holdings with price history and retry.",
    );
  }

  const maxSharpePoint = candidatePoints.reduce((best, point) => {
    const sharpe =
      point.risk > 0 ? point.return / point.risk : point.return || 0;
    if (sharpe > best.sharpe) {
      return { point, sharpe };
    }
    return best;
  }, { point: candidatePoints[0], sharpe: -Infinity }).point;

  const minVariancePoint = candidatePoints.reduce((best, point) => {
    if (point.risk < best.risk) {
      return { point, risk: point.risk };
    }
    return best;
  }, { point: candidatePoints[0], risk: Infinity }).point;

  const calculatedAt = new Date();

  await prisma.optimizedPortfolio.upsert({
    where: { portfolioId },
    create: {
      portfolioId,
      maxSharpeWeights: maxSharpePoint.weights as unknown as InputJsonValue,
      minVarianceWeights: minVariancePoint.weights as unknown as InputJsonValue,
      efficientFrontier: trimmedFrontier as unknown as InputJsonValue,
      calculatedAt,
    },
    update: {
      maxSharpeWeights: maxSharpePoint.weights as unknown as InputJsonValue,
      minVarianceWeights: minVariancePoint.weights as unknown as InputJsonValue,
      efficientFrontier: trimmedFrontier as unknown as InputJsonValue,
      calculatedAt,
    },
  });

  return {
    maxSharpeWeights: maxSharpePoint.weights,
    minVarianceWeights: minVariancePoint.weights,
    efficientFrontier: trimmedFrontier,
    calculatedAt,
  };
}

