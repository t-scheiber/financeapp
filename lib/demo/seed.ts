import { getDemoPrisma } from "@/lib/db";
import {
  DEMO_USER_EMAIL,
  DEMO_USER_ID,
  DEMO_USER_NAME,
} from "@/lib/demo/config";
import fixture from "@/lib/demo/fixture.json";

// Re-seed at most this often, so the newest sample price stays close to today.
const RESEED_INTERVAL_MS = 6 * 60 * 60 * 1000;
// Demo company ids start here so they never collide with ids in the real
// database (browser caches key some API responses by company id).
const DEMO_COMPANY_ID_OFFSET = 900_000;

let lastSeededAt = 0;
let seeding: Promise<void> | null = null;

/** Weekdays (UTC midnight), oldest first, ending on the latest weekday up to today. */
function tradingDays(count: number): Date[] {
  const days: Date[] = [];
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  while (days.length < count) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return days.reverse();
}

async function seedDemoDatabase(): Promise<void> {
  const db = getDemoPrisma();
  const days = tradingDays(fixture.tradingDays);
  const daysAgo = (n: number) => days[days.length - 1 - n];

  const companyIds = new Map<string, number>();
  fixture.companies.forEach((company, index) => {
    companyIds.set(company.symbol, DEMO_COMPANY_ID_OFFSET + index + 1);
  });
  const companyId = (symbol: string) => {
    const id = companyIds.get(symbol);
    if (!id) throw new Error(`Demo fixture references unknown symbol ${symbol}`);
    return id;
  };

  const ohlc = (closes: number[], i: number) => {
    const close = closes[i];
    const open = i > 0 ? closes[i - 1] : close;
    const round = (value: number) => Math.round(value * 100) / 100;
    return {
      open,
      close,
      high: round(Math.max(open, close) * 1.006),
      low: round(Math.min(open, close) * 0.994),
    };
  };

  await db.$transaction(async (tx) => {
    // Children first, then parents.
    await tx.priceAlert.deleteMany();
    await tx.optimizedPortfolio.deleteMany();
    await tx.holding.deleteMany();
    await tx.portfolio.deleteMany();
    await tx.watchlistCompany.deleteMany();
    await tx.watchlist.deleteMany();
    await tx.notification.deleteMany();
    await tx.notificationPreference.deleteMany();
    await tx.userApiKey.deleteMany();
    await tx.rateLimit.deleteMany();
    await tx.session.deleteMany();
    await tx.account.deleteMany();
    await tx.user.deleteMany();
    await tx.news.deleteMany();
    await tx.dividend.deleteMany();
    await tx.stockPrice.deleteMany();
    await tx.company.deleteMany();
    await tx.marketIndexPrice.deleteMany();
    await tx.marketIndex.deleteMany();
    await tx.priceCache.deleteMany();

    await tx.user.create({
      data: {
        id: DEMO_USER_ID,
        email: DEMO_USER_EMAIL,
        name: DEMO_USER_NAME,
        emailVerified: true,
        hasSeenGuide: true,
      },
    });
    await tx.notificationPreference.create({
      data: { userId: DEMO_USER_ID, emailEnabled: false },
    });

    for (const company of fixture.companies) {
      const id = companyId(company.symbol);
      await tx.company.create({
        data: {
          id,
          symbol: company.symbol,
          name: company.name,
          isin: company.isin,
          sector: company.sector,
          industry: company.industry,
          description: company.description,
        },
      });
      await tx.stockPrice.createMany({
        data: company.closes.map((_, i) => ({
          companyId: id,
          date: days[i],
          ...ohlc(company.closes, i),
          volume: company.volumes[i],
        })),
      });
    }

    for (const index of fixture.indices) {
      const created = await tx.marketIndex.create({
        data: { symbol: index.symbol, name: index.name },
      });
      await tx.marketIndexPrice.createMany({
        data: index.closes.map((_, i) => ({
          indexId: created.id,
          date: days[i],
          ...ohlc(index.closes, i),
        })),
      });
    }

    await tx.dividend.createMany({
      data: fixture.dividends.map((dividend) => ({
        companyId: companyId(dividend.symbol),
        exDividendDate: daysAgo(dividend.tradingDaysAgo),
        amount: dividend.amount,
        currency: "USD",
      })),
    });

    await tx.news.createMany({
      data: fixture.news.map((item, i) => ({
        companyId: companyId(item.symbol),
        title: item.title,
        summary: item.summary,
        url: `https://example.com/financeapp-demo/${item.symbol.toLowerCase()}-${i + 1}`,
        source: "Demo data (fictional)",
        publishedAt: new Date(
          daysAgo(item.tradingDaysAgo).getTime() + 14 * 60 * 60 * 1000,
        ),
        sentiment: item.sentiment,
        biasLevel: "low",
        biasType: "none",
      })),
    });

    for (const watchlist of fixture.watchlists) {
      await tx.watchlist.create({
        data: {
          userId: DEMO_USER_ID,
          name: watchlist.name,
          companies: {
            create: watchlist.symbols.map((symbol) => ({
              companyId: companyId(symbol),
            })),
          },
        },
      });
    }

    for (const portfolio of fixture.portfolios) {
      await tx.portfolio.create({
        data: {
          userId: DEMO_USER_ID,
          name: portfolio.name,
          holdings: {
            create: portfolio.holdings.map((holding) => ({
              companyId: companyId(holding.symbol),
              weight: holding.weight,
            })),
          },
        },
      });
    }

    await tx.priceAlert.createMany({
      data: fixture.priceAlerts.map((alert) => ({
        userId: DEMO_USER_ID,
        companyId: companyId(alert.symbol),
        direction: alert.direction,
        threshold: alert.threshold,
      })),
    });
  });
}

/**
 * Load the committed fixture into the demo database if it has not been
 * loaded by this process in the last few hours. Concurrent callers share one
 * run. The whole reset runs in one transaction, so readers never see a
 * half-seeded database.
 */
export async function ensureDemoData(): Promise<void> {
  if (Date.now() - lastSeededAt < RESEED_INTERVAL_MS) return;
  if (!seeding) {
    seeding = seedDemoDatabase()
      .then(() => {
        lastSeededAt = Date.now();
      })
      .finally(() => {
        seeding = null;
      });
  }
  await seeding;
}
