import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FinancialAPI } from "@/lib/services/financial-api";
import { NewsAPI } from "@/lib/services/news-api";
import { checkPriceAlertsForCompany } from "@/lib/services/price-alerts";
import { SentimentAPI } from "@/lib/services/sentiment-api";

const financialAPI = new FinancialAPI();
const newsAPI = new NewsAPI();
const sentimentAPI = new SentimentAPI();

// Verify the request is from a cron job (optional but recommended)
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    // If no secret is set, allow all requests (dev mode)
    return true;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results = {
    success: true,
    companiesProcessed: 0,
    stockPricesUpdated: 0,
    newsArticlesUpdated: 0,
    errors: [] as string[],
  };

  try {
    // Fetch all companies
    const companies = await prisma.company.findMany();
    results.companiesProcessed = companies.length;

    console.log(`[Cron] Starting refresh for ${companies.length} companies...`);

    // Process companies sequentially to respect rate limits
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
          results.stockPricesUpdated++;
          console.log(`[Cron] Updated stock price for ${company.symbol}`);

          await checkPriceAlertsForCompany(company.id, stockData.price);
        } else {
          console.warn(`[Cron] No stock data found for ${company.symbol}`);
        }

        // Small delay to respect Alpha Vantage rate limit (5 calls/min)
        await new Promise((resolve) => setTimeout(resolve, 12000)); // 12 seconds between calls

        // Fetch and update news with sentiment analysis
        const articles = await newsAPI.getCompanyNews(company.name);

        for (const article of articles) {
          try {
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
            results.newsArticlesUpdated++;

            // Small delay to avoid sentiment API rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            console.error(
              `[Cron] Error upserting news for ${company.name}:`,
              error,
            );
          }
        }

        console.log(
          `[Cron] Updated ${articles.length} news articles for ${company.name} with sentiment analysis`,
        );

        // Small delay between companies
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 seconds
      } catch (error) {
        const errorMsg = `Error processing ${company.name}: ${error instanceof Error ? error.message : "Unknown error"}`;
        console.error(`[Cron] ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Cron] Refresh completed in ${duration}s`);

    return NextResponse.json({
      ...results,
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Fatal error during refresh:", error);
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

// Also support POST method for more flexibility
export const POST = GET;
