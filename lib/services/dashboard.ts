import { prisma } from "@/lib/db";

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

export async function getDashboardSnapshot(): Promise<DashboardCompany[]> {
  const companies = await prisma.company.findMany({
    include: {
      _count: {
        select: {
          stockPrices: true,
          dividends: true,
          news: true,
        },
      },
      stockPrices: {
        orderBy: { date: "desc" },
        take: 1,
        select: {
          date: true,
          open: true,
          close: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return companies.map((company) => ({
    id: company.id,
    name: company.name,
    symbol: company.symbol,
    isin: company.isin,
    sector: company.sector,
    industry: company.industry,
    description: company.description,
    counts: {
      stockPrices: company._count.stockPrices,
      dividends: company._count.dividends,
      news: company._count.news,
    },
    latestPrice: company.stockPrices[0]
      ? {
          date: company.stockPrices[0].date.toISOString(),
          open: company.stockPrices[0].open ?? null,
          close: company.stockPrices[0].close ?? null,
        }
      : null,
  }));
}

