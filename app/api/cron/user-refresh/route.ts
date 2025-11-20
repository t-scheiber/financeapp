import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FinancialAPI } from "@/lib/services/financial-api";
import { NewsAPI } from "@/lib/services/news-api";
import { notifyBreakingNews } from "@/lib/services/notifications";
import { SentimentAPI } from "@/lib/services/sentiment-api";
import { getUserApiKey } from "@/lib/services/user-api-keys";
import { isEtfCompany } from "@/lib/utils/company";

// Helper function for cron jobs (no session context)
async function getDemoUserEmail(): Promise<string> {
  // In a real implementation, this would get the user from a job parameter
  // For now, return the demo user
  return "demo@example.com";
}

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
    // For now, we'll process a demo user
    // In a real implementation, you'd iterate through all users
    const demoUserEmail = await getDemoUserEmail(); // This would come from your user database

    // Get user's API keys
    const alphaVantageKey = await getUserApiKey(demoUserEmail, "alpha_vantage");
    const newsApiKey = await getUserApiKey(demoUserEmail, "newsapi");
    const huggingFaceKey = await getUserApiKey(demoUserEmail, "huggingface");

    if (!alphaVantageKey || !newsApiKey) {
      return NextResponse.json({
        success: false,
        error: "Missing required API keys",
      });
    }

    // Initialize APIs with user's keys
    const financialAPI = new FinancialAPI(alphaVantageKey);
    const newsAPI = new NewsAPI(newsApiKey);
    const sentimentAPI = new SentimentAPI(huggingFaceKey || undefined);

    // Get user's watchlist companies
    // For demo, we'll use a subset of companies
    const companies = await prisma.company.findMany({
      take: 5, // Process only first 5 companies for demo
    });

    results.usersProcessed = 1;

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

        if (!isEtfCompany(company)) {
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
                  demoUserEmail,
                  demoUserEmail,
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
        } else {
          results.newsSkippedForEtfs++;
        }

        // Delay between companies
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        const errorMsg = `Error processing ${company.name}: ${error instanceof Error ? error.message : "Unknown error"}`;
        results.errors.push(errorMsg);
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
