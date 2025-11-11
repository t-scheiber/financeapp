import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // Get the most recent stock price update to infer last cron run
    const mostRecentPrice = await prisma.stockPrice.findFirst({
      orderBy: {
        date: "desc",
      },
      select: {
        date: true,
        company: {
          select: {
            symbol: true,
          },
        },
      },
    });

    // Get the most recent news article update
    const mostRecentNews = await prisma.news.findFirst({
      orderBy: {
        publishedAt: "desc",
      },
      select: {
        publishedAt: true,
        company: {
          select: {
            symbol: true,
          },
        },
      },
    });

    // Calculate next run (assuming 4-hour schedule)
    let nextRun: Date | null = null;
    let lastRun: Date | null = null;

    if (mostRecentPrice?.date) {
      lastRun = mostRecentPrice.date;
      // Add 4 hours to get next run
      nextRun = new Date(lastRun.getTime() + 4 * 60 * 60 * 1000);
    }

    return NextResponse.json({
      schedule: "Every 4 hours",
      lastRun: lastRun?.toISOString() || null,
      nextRun: nextRun?.toISOString() || null,
      lastRunCompany: mostRecentPrice?.company.symbol || null,
      lastNewsUpdate: mostRecentNews?.publishedAt.toISOString() || null,
      lastNewsCompany: mostRecentNews?.company.symbol || null,
      note: "This is an estimate based on the most recent data update. Actual schedule is configured in your hosting provider.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

