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
      // Get current stock price for a symbol
      let stockPrice = await prisma.stockPrice.findFirst({
        where: { company: { symbol } },
        orderBy: { date: "desc" },
      });

      if (!stockPrice || refresh) {
        // Fetch from API if not in database or refresh requested
        const apiData =
          (await financialAPI.getStockQuote(symbol)) ||
          (await financialAPI.getYahooFinanceData(symbol));

        if (apiData) {
          // Find or create company
          let company = await prisma.company.findUnique({
            where: { symbol },
          });

          if (!company) {
            // For demo purposes, create a basic company record
            company = await prisma.company.create({
              data: {
                name: symbol,
                symbol,
                sector: "Unknown",
                industry: "Unknown",
              },
            });
          }

          // Store in database
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
    console.error("Error fetching stock prices:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock prices" },
      { status: 500 },
    );
  }
}
