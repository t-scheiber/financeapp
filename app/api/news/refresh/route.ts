import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/auth-server";
import { NewsAPI } from "@/lib/services/news-api";
import { SentimentAPI } from "@/lib/services/sentiment-api";
import { getUserApiKey } from "@/lib/services/user-api-keys";
import { ensureUserByEmail } from "@/lib/services/users";
import { isEtfCompany } from "@/lib/utils/company";

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

    // Get user session for user-specific API keys
    const session = await getServerSession();
    let userId: string | undefined;
    
    if (session?.user?.email) {
      const user = await ensureUserByEmail({
        email: session.user.email,
        name: session.user.name ?? null,
        image: session.user.image ?? null,
      });
      if (user) {
        userId = user.id;
      }
    }

    // Try to get user's API keys, fall back to app-level keys
    let newsApiKey: string | undefined;
    let huggingFaceApiKey: string | undefined;
    
    if (userId) {
      const userNewsKey = await getUserApiKey(userId, "newsapi");
      if (userNewsKey) {
        newsApiKey = userNewsKey;
      }
      const userHfKey = await getUserApiKey(userId, "huggingface");
      if (userHfKey) {
        huggingFaceApiKey = userHfKey;
      }
    }
    
    // If no user key, NewsAPI will use process.env.NEWS_API_KEY
    const newsAPI = new NewsAPI(newsApiKey);
    // If no user key, SentimentAPI will use process.env.HUGGINGFACE_API_KEY or keyword analysis
    const sentimentAPI = new SentimentAPI(huggingFaceApiKey);

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
        // Use enhanced analysis with bias detection
        const analysisResult = await sentimentAPI.analyzeNewsWithBias(
          article.title,
          article.summary,
          article.source,
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
            sentiment: analysisResult.adjustedSentiment || analysisResult.sentiment,
            biasLevel: analysisResult.bias?.biasLevel || null,
            biasType: analysisResult.bias?.biasType || null,
            biasWarning: analysisResult.bias?.warning || null,
          },
          create: {
            companyId: company.id,
            title: article.title,
            summary: article.summary,
            url: article.url,
            source: article.source,
            publishedAt: new Date(article.publishedAt),
            sentiment: analysisResult.adjustedSentiment || analysisResult.sentiment,
            biasLevel: analysisResult.bias?.biasLevel || null,
            biasType: analysisResult.bias?.biasType || null,
            biasWarning: analysisResult.bias?.warning || null,
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

