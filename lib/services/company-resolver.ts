import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
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

  try {
    const trimmedInput = options.symbol.trim();
    const upperInput = trimmedInput.toUpperCase();
    
    if (!upperInput || upperInput.length === 0) {
      throw new Error("Symbol cannot be empty");
    }
    
    const normalisedIsin = tryNormaliseIsin(trimmedInput);
    const looksLikeIsin = Boolean(normalisedIsin);

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

    // For ISINs, we need to resolve to a symbol - can't use ISIN as symbol
    let resolvedSymbol: string;
    if (looksLikeIsin && normalisedIsin) {
      // If we have instrument details with a symbol, use that
      // Otherwise, we'll need to create with a placeholder symbol
      resolvedSymbol = instrumentDetails?.symbol?.toUpperCase() ?? `ISIN-${normalisedIsin.slice(0, 4)}`;
    } else {
      resolvedSymbol = instrumentDetails?.symbol?.toUpperCase() ?? upperInput;
    }

    // Try to get quote data, but don't fail if APIs are unavailable
    let quoteData = null;
    try {
      // For ISINs, try searching by ISIN first, then by resolved symbol
      if (looksLikeIsin && normalisedIsin && resolvedSymbol.startsWith("ISIN-")) {
        // Try to search by ISIN via Yahoo Finance
        const isinSearchDetails = await resolveInstrumentDetails(normalisedIsin);
        if (isinSearchDetails?.symbol) {
          resolvedSymbol = isinSearchDetails.symbol.toUpperCase();
        }
      }
      
      quoteData =
        (await financialApi.getStockQuote(resolvedSymbol)) ||
        (await financialApi.getYahooFinanceData(resolvedSymbol));
    } catch {
      // Continue without quote data
    }

    const fallbackName = options.fallbackName?.trim();

    const resolvedName =
      (fallbackName && fallbackName.length > 0
        ? fallbackName
        : (instrumentDetails?.shortName ??
          instrumentDetails?.longName ??
          quoteData?.symbol)) ?? (looksLikeIsin && normalisedIsin ? normalisedIsin : resolvedSymbol);

    const resolvedSector =
      options.sectorOverride ?? instrumentDetails?.sector ?? "Unknown";

    const resolvedIndustry =
      options.industryOverride ?? instrumentDetails?.industry ?? "Unknown";

    // Try to create the company, but handle potential unique constraint errors
    try {
      company = await prisma.company.create({
        data: {
          name: resolvedName,
          symbol: resolvedSymbol,
          isin: looksLikeIsin ? normalisedIsin : null,
          sector: resolvedSector,
          industry: resolvedIndustry,
        },
      });
    } catch (error) {
      // Handle Prisma unique constraint violations
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        // Unique constraint violation - try to find the existing company
        // Check which field caused the violation
        const meta = error.meta as { target?: string[] } | undefined;
        const target = meta?.target;

        if (target?.includes("symbol")) {
          const existingCompany = await prisma.company.findUnique({
            where: { symbol: resolvedSymbol },
          });
          if (existingCompany) {
            return formatResult(existingCompany);
          }
        }

        if (target?.includes("name")) {
          const existingByName = await prisma.company.findUnique({
            where: { name: resolvedName },
          });
          if (existingByName) {
            return formatResult(existingByName);
          }
        }

        // If we can't determine which field, try both
        const existingBySymbol = await prisma.company.findUnique({
          where: { symbol: resolvedSymbol },
        });
        if (existingBySymbol) {
          return formatResult(existingBySymbol);
        }

        const existingByName = await prisma.company.findUnique({
          where: { name: resolvedName },
        });
        if (existingByName) {
          return formatResult(existingByName);
        }
      }
      // If it's not a unique constraint error, or we couldn't find the existing record, rethrow
      throw error;
    }

    return formatResult(company);
  } catch (error) {
    // As a last resort, try to create a minimal company record
    // This ensures we always return something, even if APIs fail
    try {
      const upperInput = options.symbol.trim().toUpperCase();
      const normalisedIsin = tryNormaliseIsin(upperInput);
      const looksLikeIsin = Boolean(normalisedIsin);
      
      // First check by ISIN if it looks like one
      if (looksLikeIsin && normalisedIsin) {
        const existingByIsin = await prisma.company.findFirst({
          where: {
            OR: [{ isin: normalisedIsin }, { isin: upperInput }],
          },
        });
        if (existingByIsin) {
          return {
            id: existingByIsin.id,
            symbol: existingByIsin.symbol,
            name: existingByIsin.name,
            isin: existingByIsin.isin,
          };
        }
      }
      
      // Check by symbol
      const existing = await prisma.company.findUnique({
        where: { symbol: upperInput },
      });
      if (existing) {
        return {
          id: existing.id,
          symbol: existing.symbol,
          name: existing.name,
          isin: existing.isin,
        };
      }
      
      // Try to create with minimal data
      try {
        // For ISINs, we need a symbol - use a placeholder if we don't have one
        let symbolForCreation = upperInput;
        if (looksLikeIsin && normalisedIsin) {
          // Try to get symbol from ISIN search, or use placeholder
          const isinSearchDetails = await resolveInstrumentDetails(normalisedIsin);
          symbolForCreation = isinSearchDetails?.symbol?.toUpperCase() ?? `ISIN-${normalisedIsin.slice(0, 4)}`;
        }
        
        const minimalCompany = await prisma.company.create({
          data: {
            name: options.fallbackName?.trim() || (looksLikeIsin && normalisedIsin ? normalisedIsin : upperInput),
            symbol: symbolForCreation,
            isin: looksLikeIsin ? normalisedIsin : null,
            sector: options.sectorOverride || "Unknown",
            industry: options.industryOverride || "Unknown",
          },
        });
        
        return {
          id: minimalCompany.id,
          symbol: minimalCompany.symbol,
          name: minimalCompany.name,
          isin: minimalCompany.isin,
        };
      } catch (createError) {
        // If creation fails due to unique constraint, find existing company
        if (
          createError instanceof PrismaClientKnownRequestError &&
          createError.code === "P2002"
        ) {
          const existing = await prisma.company.findUnique({
            where: { symbol: upperInput },
          });
          if (existing) {
            return {
              id: existing.id,
              symbol: existing.symbol,
              name: existing.name,
              isin: existing.isin,
            };
          }
        }
        // If we still can't create or find, check one more time
        const existing = await prisma.company.findUnique({
          where: { symbol: upperInput },
        });
        if (existing) {
          return {
            id: existing.id,
            symbol: existing.symbol,
            name: existing.name,
            isin: existing.isin,
          };
        }
        // Re-throw the original error if we can't recover
        throw error;
      }
    } catch {
      // Final fallback - try to find by ISIN or symbol one more time
      const upperInput = options.symbol.trim().toUpperCase();
      const normalisedIsin = tryNormaliseIsin(upperInput);
      const looksLikeIsin = Boolean(normalisedIsin);
      
      // Try ISIN first
      if (looksLikeIsin && normalisedIsin) {
        const existingByIsin = await prisma.company.findFirst({
          where: {
            OR: [{ isin: normalisedIsin }, { isin: upperInput }],
          },
        });
        if (existingByIsin) {
          return {
            id: existingByIsin.id,
            symbol: existingByIsin.symbol,
            name: existingByIsin.name,
            isin: existingByIsin.isin,
          };
        }
      }
      
      // Try symbol
      const existing = await prisma.company.findUnique({
        where: { symbol: upperInput },
      });
      if (existing) {
        return {
          id: existing.id,
          symbol: existing.symbol,
          name: existing.name,
          isin: existing.isin,
        };
      }
      // Re-throw the original error if we can't recover
      throw error;
    }
  }
}

function tryNormaliseIsin(value: string): string | null {
  const upper = value.toUpperCase();
  const normalised = upper.replace(/[^A-Z0-9]/g, "");
  return ISIN_PATTERN.test(normalised) ? normalised : null;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveInstrumentDetails(
  query: string,
): Promise<InstrumentDetails | null> {
  let lastError: unknown = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=5&newsCount=0`,
      );
      
      // If rate limited (429) or server error (5xx), retry
      if (response.status === 429 || response.status >= 500) {
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        return null;
      }
      
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
    } catch (error) {
      lastError = error;
      // On network errors, retry if we have attempts left
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
    }
  }
  
  // Log the error in development for debugging
  if (process.env.NODE_ENV === "development" && lastError) {
    console.error("Yahoo Finance search failed after retries:", lastError);
  }
  
  return null;
}

/**
 * Try to resolve an ISIN to a ticker symbol via Yahoo Finance search.
 * Returns the resolved symbol or null if not found.
 */
export async function resolveSymbolFromIsin(isin: string): Promise<string | null> {
  if (!isin || isin.length < 12) {
    return null;
  }

  try {
    const details = await resolveInstrumentDetails(isin);
    if (details?.symbol && !details.symbol.startsWith("ISIN-")) {
      return details.symbol.toUpperCase();
    }
    return null;
  } catch {
    return null;
  }
}