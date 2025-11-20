import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { WATCHLIST_COMPANY_LIMIT } from "@/lib/constants/limits";
import { resolveOrCreateCompany } from "@/lib/services/company-resolver";
import { ensureUserByEmail } from "@/lib/services/users";
import { addCompanyToWatchlist, getWatchlist } from "@/lib/services/watchlists";
import { getApiKeyStatus } from "@/lib/services/user-api-keys";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ watchlistId: string }> },
) {
  try {
    const { watchlistId } = await params;
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!watchlistId) {
      return NextResponse.json(
        { error: "Watchlist id is required" },
        { status: 400 },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      symbol?: string;
      name?: string;
      type?: string;
    } | null;

    const rawSymbol =
      typeof body?.symbol === "string" ? body.symbol.trim() : "";

    if (!rawSymbol) {
      return NextResponse.json(
        { error: "Symbol or ISIN is required" },
        { status: 400 },
      );
    }

    // Normalize input - the resolver will handle ISIN detection
    const symbol = rawSymbol.toUpperCase();
    const requestedLabel =
      typeof body?.name === "string" ? body.name.trim() : "";
    const requestedType =
      typeof body?.type === "string" ? body.type.toLowerCase() : "equity";
    const isEtf = requestedType === "etf";

    const user = await ensureUserByEmail({
      email: session.user.email,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
    });

    if (!user) {
      return NextResponse.json(
        { error: "Unable to resolve user" },
        { status: 500 },
      );
    }

    const apiKeyStatus = await getApiKeyStatus(user.id);
    if (!apiKeyStatus.hasAll) {
      return NextResponse.json(
        {
          error:
            "Add all required API keys (Alpha Vantage, NewsAPI, Hugging Face) before adding symbols.",
          missingProviders: apiKeyStatus.missingProviders,
        },
        { status: 400 },
      );
    }

    const watchlist = await prisma.watchlist.findUnique({
      where: { id: watchlistId },
      select: { id: true, userId: true },
    });

    if (!watchlist || watchlist.userId !== user.id) {
      return NextResponse.json(
        { error: "Watchlist not found" },
        { status: 404 },
      );
    }

    const totalTrackedSymbols = await prisma.watchlistCompany.count({
      where: {
        watchlist: {
          userId: user.id,
        },
      },
    });

    if (totalTrackedSymbols >= WATCHLIST_COMPANY_LIMIT) {
      return NextResponse.json(
        {
          error: `You can track up to ${WATCHLIST_COMPANY_LIMIT} symbols across your watchlists. Remove an existing entry before adding more.`,
        },
        { status: 400 },
      );
    }

    let company;
    try {
      company = await resolveOrCreateCompany({
        symbol,
        fallbackName: requestedLabel || undefined,
        sectorOverride: isEtf ? "ETF" : undefined,
        industryOverride: isEtf ? "Exchange Traded Fund" : undefined,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        {
          error: `Failed to resolve company symbol: ${symbol}`,
          details: errorMessage,
        },
        { status: 500 },
      );
    }

    const existingEntry = await prisma.watchlistCompany.findUnique({
      where: {
        watchlistId_companyId: {
          watchlistId: watchlist.id,
          companyId: company.id,
        },
      },
    });

    if (existingEntry) {
      const current = await getWatchlist(watchlist.id);
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        watchlist: current,
      });
    }

    try {
      await addCompanyToWatchlist(watchlist.id, company.id);
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const current = await getWatchlist(watchlist.id);
        return NextResponse.json({
          success: true,
          alreadyExists: true,
          watchlist: current,
        });
      }
      throw error;
    }

    const updatedWatchlist = await getWatchlist(watchlist.id);

    if (!updatedWatchlist) {
      return NextResponse.json(
        { error: "Failed to retrieve updated watchlist" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      watchlist: updatedWatchlist,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        error: "Failed to add symbol to watchlist",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}
