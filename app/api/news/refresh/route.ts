import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { NewsAPI } from "@/lib/services/news-api";
import { SentimentAPI } from "@/lib/services/sentiment-api";
import { isEtfCompany } from "@/lib/utils/company";

const newsAPI = new NewsAPI();
const sentimentAPI = new SentimentAPI();

type RefreshPayload = {
  companyId?: number;
  companyName?: string;
  limit?: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as RefreshPayload;
    const companyId = body.companyId;
    const companyNameInput = body.companyName?.trim();

    if (!companyId && !companyNameInput) {
      return NextResponse.json(
        { error: "companyId or companyName is required" },
        { status: 400 },
      );
    }

    const orConditions: Array<{ id?: number; name?: string }> = [];
    if (companyId) {
      orConditions.push({ id: companyId });
    }
    if (companyNameInput) {
      orConditions.push({ name: companyNameInput });
    }

    const company = await prisma.company.findFirst({
      where: orConditions.length ? { OR: orConditions } : undefined,
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 },
      );
    }

    if (isEtfCompany(company)) {
      return NextResponse.json(
        {
          error:
            "ETF coverage excludes direct news lookups to preserve API quota.",
        },
        { status: 400 },
      );
    }

    const articles = await newsAPI.getCompanyNews(
      company.name,
      body.limit ?? 10,
    );

    for (const article of articles) {
      try {
        const sentimentResult = await sentimentAPI.analyzeNews(
          article.title,
          article.summary,
        );

        await prisma.news.upsert({
          where: {
            companyId_url: {
              companyId: company.id,
              url: article.url,
            },
          },
          update: {
            title: article.title,
            summary: article.summary,
            source: article.source,
            publishedAt: new Date(article.publishedAt),
            sentiment: sentimentResult.sentiment,
          },
          create: {
            companyId: company.id,
            title: article.title,
            summary: article.summary,
            url: article.url,
            source: article.source,
            publishedAt: new Date(article.publishedAt),
            sentiment: sentimentResult.sentiment,
          },
        });

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (articleError) {
        void articleError;
      }
    }

    const refreshedNews = await prisma.news.findMany({
      where: { companyId: company.id },
      orderBy: { publishedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      companyId: company.id,
      articlesProcessed: articles.length,
      news: refreshedNews,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to refresh news";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

