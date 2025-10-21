import { prisma } from "@/lib/db";

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  companies: {
    id: number;
    name: string;
    symbol: string;
    isin?: string | null;
    industry?: string | null;
  }[];
}

export interface WatchlistCompany {
  id: string;
  watchlistId: string;
  companyId: number;
  addedAt: Date;
  company: {
    id: number;
    name: string;
    symbol: string;
    isin?: string | null;
    industry?: string | null;
  };
}

/**
 * Create a new watchlist
 */
export async function createWatchlist(
  userId: string,
  name: string,
): Promise<Watchlist | null> {
  try {
    const watchlist = await prisma.watchlist.create({
      data: {
        userId,
        name,
      },
      include: {
        companies: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                symbol: true,
                isin: true,
                industry: true,
              },
            },
          },
        },
      },
    });

    return {
      id: watchlist.id,
      userId: watchlist.userId,
      name: watchlist.name,
      createdAt: watchlist.createdAt,
      updatedAt: watchlist.updatedAt,
      companies: watchlist.companies.map((wc) => ({
        id: wc.company.id,
        name: wc.company.name,
        symbol: wc.company.symbol,
        isin: wc.company.isin,
        industry: wc.company.industry,
      })),
    };
  } catch (error) {
    console.error("Error creating watchlist:", error);
    return null;
  }
}

/**
 * Get all watchlists for a user
 */
export async function getUserWatchlists(userId: string): Promise<Watchlist[]> {
  try {
    const watchlists = await prisma.watchlist.findMany({
      where: { userId },
      include: {
        companies: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                symbol: true,
                isin: true,
                industry: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return watchlists.map((watchlist) => ({
      id: watchlist.id,
      userId: watchlist.userId,
      name: watchlist.name,
      createdAt: watchlist.createdAt,
      updatedAt: watchlist.updatedAt,
      companies: watchlist.companies.map((wc) => ({
        id: wc.company.id,
        name: wc.company.name,
        symbol: wc.company.symbol,
        isin: wc.company.isin,
        industry: wc.company.industry,
      })),
    }));
  } catch (error) {
    console.error("Error getting user watchlists:", error);
    return [];
  }
}

/**
 * Get a specific watchlist by ID
 */
export async function getWatchlist(id: string): Promise<Watchlist | null> {
  try {
    const watchlist = await prisma.watchlist.findUnique({
      where: { id },
      include: {
        companies: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                symbol: true,
                isin: true,
                industry: true,
              },
            },
          },
        },
      },
    });

    if (!watchlist) return null;

    return {
      id: watchlist.id,
      userId: watchlist.userId,
      name: watchlist.name,
      createdAt: watchlist.createdAt,
      updatedAt: watchlist.updatedAt,
      companies: watchlist.companies.map((wc) => ({
        id: wc.company.id,
        name: wc.company.name,
        symbol: wc.company.symbol,
        isin: wc.company.isin,
        industry: wc.company.industry,
      })),
    };
  } catch (error) {
    console.error("Error getting watchlist:", error);
    return null;
  }
}

/**
 * Add company to watchlist
 */
export async function addCompanyToWatchlist(
  watchlistId: string,
  companyId: number,
): Promise<boolean> {
  try {
    await prisma.watchlistCompany.create({
      data: {
        watchlistId,
        companyId,
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding company to watchlist:", error);
    return false;
  }
}

/**
 * Remove company from watchlist
 */
export async function removeCompanyFromWatchlist(
  watchlistId: string,
  companyId: number,
): Promise<boolean> {
  try {
    await prisma.watchlistCompany.deleteMany({
      where: {
        watchlistId,
        companyId,
      },
    });
    return true;
  } catch (error) {
    console.error("Error removing company from watchlist:", error);
    return false;
  }
}

/**
 * Delete watchlist
 */
export async function deleteWatchlist(id: string): Promise<boolean> {
  try {
    await prisma.watchlist.delete({
      where: { id },
    });
    return true;
  } catch (error) {
    console.error("Error deleting watchlist:", error);
    return false;
  }
}

/**
 * Get all companies in user's watchlists
 */
export async function getUserWatchlistCompanies(userId: string): Promise<
  {
    id: number;
    name: string;
    symbol: string;
    isin?: string | null;
    industry?: string | null;
    watchlistId: string;
    watchlistName: string;
  }[]
> {
  try {
    const watchlistCompanies = await prisma.watchlistCompany.findMany({
      where: {
        watchlist: {
          userId,
        },
      },
      include: {
        watchlist: true,
        company: {
          select: {
            id: true,
            name: true,
            symbol: true,
            isin: true,
            industry: true,
          },
        },
      },
    });

    return watchlistCompanies.map((wc) => ({
      id: wc.company.id,
      name: wc.company.name,
      symbol: wc.company.symbol,
      isin: wc.company.isin,
      industry: wc.company.industry,
      watchlistId: wc.watchlist.id,
      watchlistName: wc.watchlist.name,
    }));
  } catch (error) {
    console.error("Error getting user watchlist companies:", error);
    return [];
  }
}
