import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FinancialAPI } from "@/lib/services/financial-api";
import { NewsAPI } from "@/lib/services/news-api";
import { notifyBreakingNews } from "@/lib/services/notifications";
import { SentimentAPI } from "@/lib/services/sentiment-api";
import { getUserApiKey } from "@/lib/services/user-api-keys";
import { isEtfCompany } from "@/lib/utils/company";

// Verify the request is from a cron job
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return true; // Allow in development
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results = {
    success: true,
    usersProcessed: 0,
    companiesUpdated: 0,
    newsAnalyzed: 0,
    notificationsSent: 0,
    newsSkippedForEtfs: 0,
    errors: [] as string[],
  };

  try {
    // Get all users with valid API keys
    const usersWithKeys = await prisma.userApiKey.findMany({
      where: {
        provider: "alpha_vantage",
        isValid: true,
      },
      select: {
        userId: true,
      },
      distinct: ["userId"],
    });

    if (usersWithKeys.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No users with valid API keys found",
      });
    }

    // Process each user
    for (const { userId } of usersWithKeys) {
      try {
        // Get user's API keys
        const alphaVantageKey = await getUserApiKey(userId, "alpha_vantage");
        const newsApiKey = await getUserApiKey(userId, "newsapi");
        const huggingFaceKey = await getUserApiKey(userId, "huggingface");

        if (!alphaVantageKey) {
          results.errors.push(`User ${userId}: Missing Alpha Vantage API key`);
          continue;
        }

        // Initialize APIs with user's keys
        const financialAPI = new FinancialAPI(alphaVantageKey);
        const newsAPI = newsApiKey ? new NewsAPI(newsApiKey) : null;
        const sentimentAPI = new SentimentAPI(huggingFaceKey || undefined);

        // Get user's watchlist companies
        const userWatchlists = await prisma.watchlist.findMany({
          where: { userId },
          include: {
            companies: {
              include: { company: true },
            },
          },
        });

        // Get unique companies from user's watchlists
        const companiesMap = new Map<number, typeof userWatchlists[0]["companies"][0]["company"]>();
        for (const watchlist of userWatchlists) {
          for (const wc of watchlist.companies) {
            companiesMap.set(wc.company.id, wc.company);
          }
        }
        const companies = Array.from(companiesMap.values());

        if (companies.length === 0) {
          continue; // Skip users with no watchlist companies
        }

        results.usersProcessed++;

        // Get user email for notifications
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });
        const userEmail = user?.email || userId;

        for (const company of companies) {
          try {
            // Fetch and update stock prices
            const stockData =
              (await financialAPI.getStockQuote(company.symbol)) ||
              (await financialAPI.getYahooFinanceData(company.symbol));

            if (stockData) {
              await prisma.stockPrice.upsert({
                where: {
                  companyId_date: {
                    companyId: company.id,
                    date: new Date(stockData.date),
                  },
                },
                update: {
                  open: stockData.open,
                  high: stockData.high,
                  low: stockData.low,
                  close: stockData.price,
                  volume: stockData.volume,
                },
                create: {
                  companyId: company.id,
                  date: new Date(stockData.date),
                  open: stockData.open,
                  high: stockData.high,
                  low: stockData.low,
                  close: stockData.price,
                  volume: stockData.volume,
                },
              });
              results.companiesUpdated++;
            }

            // Small delay between API calls
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Skip news for ETFs or if no NewsAPI key
            if (!isEtfCompany(company) && newsAPI) {
              const articles = await newsAPI.getCompanyNews(company.name, 5);

              for (const article of articles) {
                const existingNews = await prisma.news.findFirst({
                  where: {
                    companyId: company.id,
                    url: article.url,
                  },
                });

                if (!existingNews) {
                  const sentimentResult = await sentimentAPI.analyzeNews(
                    article.title,
                    article.summary,
                  );

                  await prisma.news.create({
                    data: {
                      companyId: company.id,
                      title: article.title,
                      summary: article.summary,
                      url: article.url,
                      source: article.source,
                      publishedAt: new Date(article.publishedAt),
                      sentiment: sentimentResult.sentiment,
                    },
                  });

                  results.newsAnalyzed++;

                  if (
                    sentimentResult.sentiment === "negative" ||
                    sentimentResult.sentiment === "positive"
                  ) {
                    await notifyBreakingNews(
                      userId,
                      userEmail,
                      company.symbol,
                      article.title,
                      article.summary || "",
                      article.url,
                      sentimentResult.sentiment,
                    );
                    results.notificationsSent++;
                  }
                }

                await new Promise((resolve) => setTimeout(resolve, 100));
              }
            } else if (isEtfCompany(company)) {
              results.newsSkippedForEtfs++;
            }

            // Delay between companies
            await new Promise((resolve) => setTimeout(resolve, 2000));
          } catch (error) {
            const errorMsg = `Error processing ${company.name}: ${error instanceof Error ? error.message : "Unknown error"}`;
            results.errors.push(errorMsg);
          }
        }
      } catch (error) {
        results.errors.push(`Error processing user ${userId}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    return NextResponse.json({
      ...results,
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
