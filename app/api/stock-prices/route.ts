import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FinancialAPI } from "@/lib/services/financial-api";

const financialAPI = new FinancialAPI();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const symbol = searchParams.get("symbol");
    const refresh = searchParams.get("refresh") === "true";

    if (companyId) {
      // Get stock prices for a specific company
      const stockPrices = await prisma.stockPrice.findMany({
        where: { companyId: parseInt(companyId, 10) },
        orderBy: { date: "desc" },
        take: 30, // Last 30 days
      });

      return NextResponse.json(stockPrices);
    }

    if (symbol) {
      const company = await prisma.company.findUnique({
        where: { symbol },
        include: {
          stockPrices: {
            orderBy: { date: "desc" },
            take: 1,
          },
        },
      });

      if (!company) {
        return NextResponse.json(
          { error: "Unknown company symbol" },
          { status: 404 },
        );
      }

      let stockPrice = company.stockPrices[0] ?? null;

      if (refresh || !stockPrice) {
        const apiData =
          (await financialAPI.getStockQuote(symbol)) ||
          (await financialAPI.getYahooFinanceData(symbol));

        if (!apiData) {
          return NextResponse.json(
            { error: "Unable to fetch remote quote" },
            { status: 502 },
          );
        }

        stockPrice = await prisma.stockPrice.upsert({
          where: {
            companyId_date: {
              companyId: company.id,
              date: new Date(apiData.date),
            },
          },
          update: {
            open: apiData.open,
            high: apiData.high,
            low: apiData.low,
            close: apiData.price,
            volume: apiData.volume,
          },
          create: {
            companyId: company.id,
            date: new Date(apiData.date),
            open: apiData.open,
            high: apiData.high,
            low: apiData.low,
            close: apiData.price,
            volume: apiData.volume,
          },
        });
      }

      return NextResponse.json(stockPrice);
    }

    // Get all latest stock prices
    const latestPrices = await prisma.stockPrice.findMany({
      include: {
        company: {
          select: {
            name: true,
            symbol: true,
          },
        },
      },
      orderBy: [{ company: { name: "asc" } }, { date: "desc" }],
    });

    return NextResponse.json(latestPrices);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch stock prices";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
