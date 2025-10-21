import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { NewsAPI } from "@/lib/services/news-api";
import { SentimentAPI } from "@/lib/services/sentiment-api";

const newsAPI = new NewsAPI();
const sentimentAPI = new SentimentAPI();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const companyName = searchParams.get("companyName");
    const refresh = searchParams.get("refresh") === "true";

    if (companyId) {
      // Get news for a specific company by ID
      const news = await prisma.news.findMany({
        where: { companyId: parseInt(companyId, 10) },
        orderBy: { publishedAt: "desc" },
        take: 20,
      });

      return NextResponse.json(news);
    }

    if (companyName) {
      // Get news for a specific company by name
      let company = await prisma.company.findUnique({
        where: { name: companyName },
        include: { news: true },
      });

      if (!company) {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 },
        );
      }

      if (!company.news.length || refresh) {
        // Fetch fresh news from API
        const articles = await newsAPI.getCompanyNews(companyName);

        // Store in database with sentiment analysis
        for (const article of articles) {
          // Analyze sentiment for the article
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

          // Small delay to avoid rate limiting on sentiment API
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Fetch updated news
        company = await prisma.company.findUnique({
          where: { id: company.id },
          include: { news: { orderBy: { publishedAt: "desc" }, take: 20 } },
        });
      }

      return NextResponse.json(company?.news || []);
    }

    // Get all latest news
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
    console.error("Error fetching news:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 },
    );
  }
}
