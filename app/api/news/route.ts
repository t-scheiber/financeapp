import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyIdParam = searchParams.get("companyId");
    const companyName = searchParams.get("companyName");
    const refresh = searchParams.get("refresh");

    if (refresh === "true") {
      return NextResponse.json(
        {
          error:
            "Refreshing news now requires a POST to /api/news/refresh. GET requests are read-only.",
        },
        { status: 400 },
      );
    }

    if (companyIdParam) {
      const companyId = Number.parseInt(companyIdParam, 10);
      if (Number.isNaN(companyId)) {
        return NextResponse.json(
          { error: "Invalid companyId" },
          { status: 400 },
        );
      }
      const news = await prisma.news.findMany({
        where: { companyId },
        orderBy: { publishedAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          summary: true,
          url: true,
          source: true,
          publishedAt: true,
          sentiment: true,
          biasLevel: true,
          biasType: true,
          biasWarning: true,
        },
      });
      const response = NextResponse.json(news);
      // Cache news for 10 minutes
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=600, stale-while-revalidate=1800"
      );
      return response;
    }

    if (companyName) {
      const company = await prisma.company.findUnique({
        where: { name: companyName },
        include: {
          news: {
            orderBy: { publishedAt: "desc" },
            take: 20,
          },
        },
      });

      if (!company) {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 },
        );
      }

      return NextResponse.json(company.news);
    }

    const allNews = await prisma.news.findMany({
      include: {
        company: {
          select: {
            name: true,
            symbol: true,
          },
        },
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
    });

    return NextResponse.json(allNews);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch news";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
