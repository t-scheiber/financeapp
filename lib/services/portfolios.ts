import { prisma } from "@/lib/db";

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  holdings: {
    id: string;
    companyId: number;
    weight: number;
    company: {
      name: string;
      symbol: string;
    };
  }[];
  optimizedPortfolio?: {
    maxSharpeWeights: Record<string, number>;
    minVarianceWeights: Record<string, number>;
    efficientFrontier: Array<{
      risk: number;
      return: number;
      weights: Record<string, number>;
    }>;
    calculatedAt: Date;
  };
}

export interface Holding {
  id: string;
  portfolioId: string;
  companyId: number;
  weight: number;
  createdAt: Date;
  company: {
    name: string;
    symbol: string;
  };
}

export interface EfficientFrontierPoint {
  risk: number;
  return: number;
  weights: Record<string, number>;
}

/**
 * Create a new portfolio
 */
export async function createPortfolio(
  userId: string,
  name: string,
): Promise<Portfolio | null> {
  try {
    const portfolio = await prisma.portfolio.create({
      data: {
        userId,
        name,
      },
      include: {
        holdings: {
          include: {
            company: {
              select: {
                name: true,
                symbol: true,
              },
            },
          },
        },
      },
    });

    return {
      id: portfolio.id,
      userId: portfolio.userId,
      name: portfolio.name,
      createdAt: portfolio.createdAt,
      updatedAt: portfolio.updatedAt,
      holdings: portfolio.holdings.map((holding) => ({
        id: holding.id,
        companyId: holding.companyId,
        weight: holding.weight,
        company: {
          name: holding.company.name,
          symbol: holding.company.symbol,
        },
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Get all portfolios for a user
 */
export async function getUserPortfolios(userId: string): Promise<Portfolio[]> {
  try {
    const portfolios = await prisma.portfolio.findMany({
      where: { userId },
      include: {
        holdings: {
          include: {
            company: {
              select: {
                name: true,
                symbol: true,
              },
            },
          },
        },
        optimizedPortfolio: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return portfolios.map((portfolio) => ({
      id: portfolio.id,
      userId: portfolio.userId,
      name: portfolio.name,
      createdAt: portfolio.createdAt,
      updatedAt: portfolio.updatedAt,
      holdings: portfolio.holdings.map((holding) => ({
        id: holding.id,
        companyId: holding.companyId,
        weight: holding.weight,
        company: {
          name: holding.company.name,
          symbol: holding.company.symbol,
        },
      })),
      optimizedPortfolio: portfolio.optimizedPortfolio
        ? {
            maxSharpeWeights: portfolio.optimizedPortfolio
              .maxSharpeWeights as unknown as Record<string, number>,
            minVarianceWeights: portfolio.optimizedPortfolio
              .minVarianceWeights as unknown as Record<string, number>,
            efficientFrontier: portfolio.optimizedPortfolio
              .efficientFrontier as unknown as EfficientFrontierPoint[],
            calculatedAt: portfolio.optimizedPortfolio.calculatedAt,
          }
        : undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Get a specific portfolio by ID
 */
export async function getPortfolio(id: string): Promise<Portfolio | null> {
  try {
    const portfolio = await prisma.portfolio.findUnique({
      where: { id },
      include: {
        holdings: {
          include: {
            company: {
              select: {
                name: true,
                symbol: true,
              },
            },
          },
        },
        optimizedPortfolio: true,
      },
    });

    if (!portfolio) return null;

    return {
      id: portfolio.id,
      userId: portfolio.userId,
      name: portfolio.name,
      createdAt: portfolio.createdAt,
      updatedAt: portfolio.updatedAt,
      holdings: portfolio.holdings.map((holding) => ({
        id: holding.id,
        companyId: holding.companyId,
        weight: holding.weight,
        company: {
          name: holding.company.name,
          symbol: holding.company.symbol,
        },
      })),
      optimizedPortfolio: portfolio.optimizedPortfolio
        ? {
            maxSharpeWeights: portfolio.optimizedPortfolio
              .maxSharpeWeights as unknown as Record<string, number>,
            minVarianceWeights: portfolio.optimizedPortfolio
              .minVarianceWeights as unknown as Record<string, number>,
            efficientFrontier: portfolio.optimizedPortfolio
              .efficientFrontier as unknown as EfficientFrontierPoint[],
            calculatedAt: portfolio.optimizedPortfolio.calculatedAt,
          }
        : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Add holding to portfolio
 */
export async function addHolding(
  portfolioId: string,
  companyId: number,
  weight: number,
): Promise<boolean> {
  try {
    await prisma.holding.create({
      data: {
        portfolioId,
        companyId,
        weight,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Update holding weight
 */
export async function updateHolding(
  holdingId: string,
  weight: number,
): Promise<boolean> {
  try {
    await prisma.holding.update({
      where: { id: holdingId },
      data: { weight },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove holding from portfolio
 */
export async function removeHolding(holdingId: string): Promise<boolean> {
  try {
    await prisma.holding.delete({
      where: { id: holdingId },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete portfolio (also deletes all holdings and optimized results)
 */
export async function deletePortfolio(id: string): Promise<boolean> {
  try {
    // Delete optimized portfolio first (due to foreign key)
    await prisma.optimizedPortfolio.deleteMany({
      where: { portfolioId: id },
    });

    // Delete portfolio (cascades to holdings)
    await prisma.portfolio.delete({
      where: { id },
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize portfolio weights to sum to 1
 */
export function normalizeWeights(
  weights: Record<string, number>,
): Record<string, number> {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);

  if (total === 0) {
    return weights;
  }

  const normalized: Record<string, number> = {};
  for (const [symbol, weight] of Object.entries(weights)) {
    normalized[symbol] = weight / total;
  }

  return normalized;
}

/**
 * Validate portfolio weights sum to approximately 1
 */
export function validateWeights(weights: Record<string, number>): {
  isValid: boolean;
  sum: number;
  message: string;
} {
  const sum = Object.values(weights).reduce(
    (total, weight) => total + weight,
    0,
  );

  if (Math.abs(sum - 1) > 0.01) {
    // Allow 1% tolerance
    return {
      isValid: false,
      sum,
      message: `Weights should sum to 1.0, currently ${sum.toFixed(3)}`,
    };
  }

  return {
    isValid: true,
    sum,
    message: "Weights are valid",
  };
}

export async function optimisePortfolioEqualWeight(
  portfolioId: string,
): Promise<Portfolio | null> {
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    include: {
      holdings: true,
    },
  });

  if (!portfolio || portfolio.holdings.length === 0) {
    return null;
  }

  const equalWeight = Number.parseFloat(
    (1 / portfolio.holdings.length).toFixed(4),
  );

  await Promise.all(
    portfolio.holdings.map((holding) =>
      prisma.holding.update({
        where: { id: holding.id },
        data: { weight: equalWeight },
      }),
    ),
  );

  return getPortfolio(portfolioId);
}
