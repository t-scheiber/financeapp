import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma";

// Cache companies list for 60 seconds (revalidate on data changes)
export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    let where: Prisma.CompanyWhereInput | undefined;
    if (query && query.length > 0) {
      const upperQuery = query.toUpperCase();
      const normalisedIsin = upperQuery.replace(/[^A-Z0-9]/g, "");

      const orFilters: Prisma.CompanyWhereInput[] = [
        { name: { contains: query } },
        { symbol: { contains: query } },
        { industry: { contains: query } },
        { description: { contains: query } },
      ];

      if (upperQuery) {
        orFilters.push({ isin: upperQuery });
      }

      if (normalisedIsin && normalisedIsin !== upperQuery) {
        orFilters.push({ isin: normalisedIsin });
      }

      where = { OR: orFilters };
    }

    const companies = await prisma.company.findMany({
      where,
      select: {
        id: true,
        name: true,
        symbol: true,
        isin: true,
        sector: true,
        industry: true,
        description: true,
        _count: {
          select: {
            stockPrices: true,
            dividends: true,
            news: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const response = NextResponse.json(companies);
    // Add cache headers for client-side caching
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    );
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch companies";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
