import { type NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/db";
import { FinancialAPI } from "@/lib/services/financial-api";
import { NewsAPI } from "@/lib/services/news-api";
import { checkPriceAlertsForCompany } from "@/lib/services/price-alerts";
import { SentimentAPI } from "@/lib/services/sentiment-api";
import { isEtfCompany } from "@/lib/utils/company";
import { resolveSymbolFromIsin } from "@/lib/services/company-resolver";

const financialAPI = new FinancialAPI();
const newsAPI = new NewsAPI();
const sentimentAPI = new SentimentAPI();

const DEFAULT_BATCH_SIZE = Math.max(
  1,
  Number.parseInt(process.env.CRON_BATCH_SIZE ?? "1", 10) || 1,
);
const MAX_RUNTIME_MS = Math.max(
  5_000,
  Number.parseInt(process.env.CRON_MAX_RUNTIME_MS ?? "15000", 10) || 15_000,
);
const PRICE_DELAY_MS = Math.max(
  0,
  Number.parseInt(process.env.CRON_PRICE_DELAY_MS ?? "12000", 10) || 12_000,
);
const ARTICLE_DELAY_MS = Math.max(
  0,
  Number.parseInt(process.env.CRON_NEWS_DELAY_MS ?? "100", 10) || 100,
);

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return true;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

async function wait(ms: number) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

type RefreshJobRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.refreshJob.findUnique>>
>;

async function getOrCreateJob(options: {
  jobId?: string | null;
  requestedBatchSize?: number | null;
}): Promise<RefreshJobRecord> {
  const requestedBatchSize =
    options.requestedBatchSize && options.requestedBatchSize > 0
      ? options.requestedBatchSize
      : undefined;

  if (options.jobId) {
    const existing = await prisma.refreshJob.findUnique({
      where: { id: options.jobId },
    });
    if (!existing) {
      throw new Error(`Refresh job ${options.jobId} not found`);
    }

    if (
      requestedBatchSize &&
      requestedBatchSize !== existing.batchSize &&
      existing.status !== "COMPLETED"
    ) {
      return prisma.refreshJob.update({
        where: { id: existing.id },
        data: { batchSize: requestedBatchSize },
      });
    }

    return existing;
  }

  const totalCompanies = await prisma.company.count();
  return prisma.refreshJob.create({
    data: {
      status: totalCompanies === 0 ? "COMPLETED" : "RUNNING",
      totalCompanies,
      batchSize: requestedBatchSize ?? DEFAULT_BATCH_SIZE,
    },
  });
}

async function appendJobError(jobId: string, message: string) {
  const existing = await prisma.refreshJob.findUnique({
    where: { id: jobId },
    select: { errors: true },
  });
  const baseErrors = Array.isArray(existing?.errors)
    ? [...(existing.errors as Prisma.JsonArray)]
    : [];
  const errorsArray: Prisma.JsonArray = baseErrors;
  errorsArray.push({
    message,
    timestamp: new Date().toISOString(),
  });
  if (errorsArray.length > 25) {
    errorsArray.shift();
  }
  await prisma.refreshJob.update({
    where: { id: jobId },
    data: {
      errorCount: { increment: 1 },
      errors: errorsArray,
    },
  });
}

type RefreshCompany = {
  id: number;
  symbol: string;
  name: string;
  industry?: string | null;
  sector?: string | null;
  isin?: string | null;
};

async function updateStockPrice(company: RefreshCompany) {
  let symbolToUse = company.symbol;

  // If the symbol is a placeholder (ISIN-XXX), try to resolve it
  if (company.symbol.startsWith("ISIN-") && company.isin) {
    const resolvedSymbol = await resolveSymbolFromIsin(company.isin);
    if (resolvedSymbol && !resolvedSymbol.startsWith("ISIN-")) {
      // Update the company with the resolved symbol
      try {
        await prisma.company.update({
          where: { id: company.id },
          data: { symbol: resolvedSymbol },
        });
        symbolToUse = resolvedSymbol;
      } catch {
        // If update fails (e.g., symbol already exists), continue with original
      }
    }
  }

  const stockData =
    (await financialAPI.getStockQuote(symbolToUse)) ||
    (await financialAPI.getYahooFinanceData(symbolToUse));

  if (!stockData) {
    return false;
  }

  // Validate critical fields before storing
  if (!Number.isFinite(stockData.price) || stockData.price <= 0) {
    return false;
  }

  const parsedDate = new Date(stockData.date);
  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  await prisma.stockPrice.upsert({
    where: {
      companyId_date: {
        companyId: company.id,
        date: parsedDate,
      },
    },
    update: {
      open: Number.isFinite(stockData.open) ? stockData.open : null,
      high: Number.isFinite(stockData.high) ? stockData.high : null,
      low: Number.isFinite(stockData.low) ? stockData.low : null,
      close: stockData.price,
      volume: Number.isFinite(stockData.volume) ? stockData.volume : null,
    },
    create: {
      companyId: company.id,
      date: parsedDate,
      open: Number.isFinite(stockData.open) ? stockData.open : null,
      high: Number.isFinite(stockData.high) ? stockData.high : null,
      low: Number.isFinite(stockData.low) ? stockData.low : null,
      close: stockData.price,
      volume: Number.isFinite(stockData.volume) ? stockData.volume : null,
    },
  });

  await checkPriceAlertsForCompany(company.id, stockData.price);
  return true;
}

async function refreshCompanyNews(company: RefreshCompany) {
  if (isEtfCompany(company)) {
    return 0;
  }

  const articles = await newsAPI.getCompanyNews(company.name);
  let processed = 0;

  for (const article of articles) {
    try {
      // Validate required fields
      if (!article.title || !article.url || !article.source) {
        continue;
      }

      // Validate and parse the date
      const publishedAt = new Date(article.publishedAt);
      if (Number.isNaN(publishedAt.getTime())) {
        continue;
      }

      // Truncate URL if too long (database might have varchar limit)
      const url = article.url.length > 2000 ? article.url.slice(0, 2000) : article.url;

      const sentiment = await sentimentAPI.analyzeNews(
        article.title,
        article.summary,
      );

      await prisma.news.upsert({
        where: {
          companyId_url: {
            companyId: company.id,
            url,
          },
        },
        update: {
          title: article.title,
          summary: article.summary || null,
          source: article.source,
          publishedAt,
          sentiment: sentiment.sentiment,
        },
        create: {
          companyId: company.id,
          title: article.title,
          summary: article.summary || null,
          url,
          source: article.source,
          publishedAt,
          sentiment: sentiment.sentiment,
        },
      });
      processed++;
      await wait(ARTICLE_DELAY_MS);
    } catch {
      // ignore article-level failures to keep the batch moving
    }
  }

  return processed;
}

async function processJobBatch(job: RefreshJobRecord) {
  if (!job) {
    throw new Error("Missing job record");
  }

  if (job.status === "COMPLETED") {
    return {
      job,
      stats: {
        processed: 0,
        stockUpdates: 0,
        newsUpdates: 0,
      },
    };
  }

  let updatedJob = job;
  let processed = 0;
  let stockUpdates = 0;
  let newsUpdates = 0;

  const startTime = Date.now();

  while (Date.now() - startTime < MAX_RUNTIME_MS) {
    const companies = await prisma.company.findMany({
      orderBy: { id: "asc" },
      skip: updatedJob.processedCompanies,
      take: updatedJob.batchSize,
      select: {
        id: true,
        symbol: true,
        name: true,
        industry: true,
        sector: true,
        isin: true,
      },
    });

    if (!companies.length) {
      updatedJob = await prisma.refreshJob.update({
        where: { id: updatedJob.id },
        data: { status: "COMPLETED" },
      });
      break;
    }

    for (const company of companies) {
      try {
        const stockChanged = await updateStockPrice(company);
        if (stockChanged) {
          stockUpdates++;
        }
        await wait(PRICE_DELAY_MS);

        const newsCount = await refreshCompanyNews(company);
        newsUpdates += newsCount;
      } catch (error) {
        const message = `Error processing ${company.name}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        await appendJobError(updatedJob.id, message);
      } finally {
        processed++;
        updatedJob = await prisma.refreshJob.update({
          where: { id: updatedJob.id },
          data: {
            processedCompanies: { increment: 1 },
            lastCompanyId: company.id,
          },
        });
      }

      if (Date.now() - startTime >= MAX_RUNTIME_MS) {
        break;
      }
    }

    if (updatedJob.processedCompanies >= updatedJob.totalCompanies) {
      updatedJob = await prisma.refreshJob.update({
        where: { id: updatedJob.id },
        data: { status: "COMPLETED" },
      });
      break;
    }
  }

  return {
    job: updatedJob,
    stats: {
      processed,
      stockUpdates,
      newsUpdates,
    },
  };
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");
    const batchSizeParam = url.searchParams.get("batchSize");
    const parsedBatchSize = batchSizeParam
      ? Number.parseInt(batchSizeParam, 10)
      : Number.NaN;
    const requestedBatchSize = Number.isFinite(parsedBatchSize)
      ? parsedBatchSize
      : null;

    const job = await getOrCreateJob({
      jobId,
      requestedBatchSize,
    });

    const { job: updatedJob, stats } = await processJobBatch(job);

    const hasMore =
      updatedJob.status !== "COMPLETED" &&
      updatedJob.processedCompanies < updatedJob.totalCompanies;

    return NextResponse.json({
      success: true,
      jobId: updatedJob.id,
      status: updatedJob.status,
      processedCompanies: updatedJob.processedCompanies,
      totalCompanies: updatedJob.totalCompanies,
      batchSize: updatedJob.batchSize,
      stockPricesUpdated: stats.stockUpdates,
      newsArticlesUpdated: stats.newsUpdates,
      hasMore,
      nextSuggestedRun: hasMore
        ? new Date(Date.now() + PRICE_DELAY_MS).toISOString()
        : null,
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

export const POST = GET;
