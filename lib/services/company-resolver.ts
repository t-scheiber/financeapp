import { prisma } from "@/lib/db";
import { FinancialAPI } from "@/lib/services/financial-api";

const financialApi = new FinancialAPI();

const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

type ResolvedCompany = {
  id: number;
  symbol: string;
  name: string;
  isin?: string | null;
};

type InstrumentDetails = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  sector?: string;
  industry?: string;
};

export async function resolveOrCreateCompany(options: {
  symbol: string;
  fallbackName?: string;
  sectorOverride?: string | null;
  industryOverride?: string | null;
}): Promise<ResolvedCompany> {
  const trimmedInput = options.symbol.trim();
  const upperInput = trimmedInput.toUpperCase();
  const normalisedIsin = tryNormaliseIsin(trimmedInput);
  const looksLikeIsin = Boolean(normalisedIsin);

  const formatResult = (company: {
    id: number;
    symbol: string;
    name: string;
    isin: string | null;
  }): ResolvedCompany => ({
    id: company.id,
    symbol: company.symbol,
    name: company.name,
    isin: company.isin,
  });

  if (looksLikeIsin && normalisedIsin) {
    let company = await prisma.company.findFirst({
      where: {
        OR: [{ isin: normalisedIsin }, { isin: upperInput }],
      },
    });

    if (company) {
      if (company.isin !== normalisedIsin) {
        company = await prisma.company.update({
          where: { id: company.id },
          data: { isin: normalisedIsin },
        });
      }
      return formatResult(company);
    }
  }

  let company = await prisma.company.findUnique({
    where: { symbol: upperInput },
  });

  if (company) {
    if (looksLikeIsin && normalisedIsin && !company.isin) {
      company = await prisma.company.update({
        where: { id: company.id },
        data: { isin: normalisedIsin },
      });
    }
    return formatResult(company);
  }

  const searchTerm =
    looksLikeIsin && normalisedIsin ? normalisedIsin : upperInput;
  const instrumentDetails =
    (await resolveInstrumentDetails(searchTerm)) ?? null;

  if (instrumentDetails?.symbol) {
    const resolvedSymbol = instrumentDetails.symbol.toUpperCase();
    company = await prisma.company.findUnique({
      where: { symbol: resolvedSymbol },
    });
    if (company) {
      if (looksLikeIsin && normalisedIsin && !company.isin) {
        company = await prisma.company.update({
          where: { id: company.id },
          data: { isin: normalisedIsin },
        });
      }
      return formatResult(company);
    }
  }

  const resolvedSymbol = instrumentDetails?.symbol?.toUpperCase() ?? upperInput;

  const quoteData =
    (await financialApi.getStockQuote(resolvedSymbol)) ||
    (await financialApi.getYahooFinanceData(resolvedSymbol));

  const fallbackName = options.fallbackName?.trim();

  const resolvedName =
    (fallbackName && fallbackName.length > 0
      ? fallbackName
      : (instrumentDetails?.shortName ??
        instrumentDetails?.longName ??
        quoteData?.symbol)) ?? resolvedSymbol;

  const resolvedSector =
    options.sectorOverride ?? instrumentDetails?.sector ?? "Unknown";

  const resolvedIndustry =
    options.industryOverride ?? instrumentDetails?.industry ?? "Unknown";

  company = await prisma.company.create({
    data: {
      name: resolvedName,
      symbol: resolvedSymbol,
      isin: looksLikeIsin ? normalisedIsin : null,
      sector: resolvedSector,
      industry: resolvedIndustry,
    },
  });

  return formatResult(company);
}

function tryNormaliseIsin(value: string): string | null {
  const upper = value.toUpperCase();
  const normalised = upper.replace(/[^A-Z0-9]/g, "");
  return ISIN_PATTERN.test(normalised) ? normalised : null;
}

async function resolveInstrumentDetails(
  query: string,
): Promise<InstrumentDetails | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=5&newsCount=0`,
    );
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      quotes?: Array<{
        symbol?: string;
        shortname?: string;
        longname?: string;
        sector?: string;
        sectorDisp?: string;
        industry?: string;
        industryDisp?: string;
      }>;
    };

    const upper = query.toUpperCase();
    const match =
      data.quotes?.find((quote) => quote.symbol?.toUpperCase() === upper) ??
      data.quotes?.[0];

    if (!match) {
      return null;
    }

    return {
      symbol: match.symbol,
      shortName: match.shortname,
      longName: match.longname,
      sector: match.sector ?? match.sectorDisp,
      industry: match.industry ?? match.industryDisp,
    };
  } catch {
    return null;
  }
}
