import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/auth-server";
import { resolveSymbolFromIsin } from "@/lib/services/company-resolver";
import { FinancialAPI } from "@/lib/services/financial-api";
import { getUserApiKey } from "@/lib/services/user-api-keys";
import { ensureUserByEmail } from "@/lib/services/users";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const symbol = searchParams.get("symbol");
    const refresh = searchParams.get("refresh") === "true";

    // Get user's API key if authenticated, otherwise use app-level key
    let alphaVantageKey: string | undefined;
    const session = await getServerSession();
    if (session?.user?.email) {
      const user = await ensureUserByEmail({
        email: session.user.email,
        name: session.user.name ?? null,
        image: session.user.image ?? null,
      });
      if (user) {
        const userKey = await getUserApiKey(user.id, "alpha_vantage");
        if (userKey) {
          alphaVantageKey = userKey;
        }
      }
    }

    // Use user's key or fall back to app-level key
    const financialAPI = new FinancialAPI(alphaVantageKey);

    if (companyId) {
      // Get stock prices for a specific company - select only needed fields
      const stockPrices = await prisma.stockPrice.findMany({
        where: { companyId: parseInt(companyId, 10) },
        orderBy: { date: "desc" },
        take: 30, // Last 30 days
        select: {
          id: true,
          date: true,
          open: true,
          high: true,
          low: true,
          close: true,
          volume: true,
        },
      });

      const response = NextResponse.json(stockPrices);
      // Cache for 5 minutes, stale-while-revalidate for 30 minutes
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=300, stale-while-revalidate=1800"
      );
      return response;
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
        // Determine which symbol to use for API calls
        let symbolToUse = symbol;

        // If the symbol is a placeholder (ISIN-XXX), try to resolve it
        if (symbol.startsWith("ISIN-") && company.isin) {
          const resolvedSymbol = await resolveSymbolFromIsin(company.isin);
          if (resolvedSymbol && !resolvedSymbol.startsWith("ISIN-")) {
            // Update the company with the resolved symbol
            try {
              await prisma.company.update({
                where: { id: company.id },
                data: { symbol: resolvedSymbol },
              });
              symbolToUse = resolvedSymbol;
            } catch {
              // If update fails (e.g., symbol already exists), continue with original
            }
          }
        }

        const apiData =
          (await financialAPI.getStockQuote(symbolToUse)) ||
          (await financialAPI.getYahooFinanceData(symbolToUse));

        if (!apiData) {
          return NextResponse.json(
            { error: "Unable to fetch remote quote" },
            { status: 502 },
          );
        }

        // Validate critical fields before storing
        if (!Number.isFinite(apiData.price) || apiData.price <= 0) {
          return NextResponse.json(
            { error: "Invalid price data received" },
            { status: 502 },
          );
        }

        const parsedDate = new Date(apiData.date);
        if (Number.isNaN(parsedDate.getTime())) {
          return NextResponse.json(
            { error: "Invalid date in price data" },
            { status: 502 },
          );
        }

        stockPrice = await prisma.stockPrice.upsert({
          where: {
            companyId_date: {
              companyId: company.id,
              date: parsedDate,
            },
          },
          update: {
            open: Number.isFinite(apiData.open) ? apiData.open : null,
            high: Number.isFinite(apiData.high) ? apiData.high : null,
            low: Number.isFinite(apiData.low) ? apiData.low : null,
            close: apiData.price,
            volume: Number.isFinite(apiData.volume) ? apiData.volume : null,
          },
          create: {
            companyId: company.id,
            date: parsedDate,
            open: Number.isFinite(apiData.open) ? apiData.open : null,
            high: Number.isFinite(apiData.high) ? apiData.high : null,
            low: Number.isFinite(apiData.low) ? apiData.low : null,
            close: apiData.price,
            volume: Number.isFinite(apiData.volume) ? apiData.volume : null,
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
