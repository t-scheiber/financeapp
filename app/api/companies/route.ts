import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma";

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
      include: {
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

    return NextResponse.json(companies);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch companies";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
