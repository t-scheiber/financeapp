type CompanyLike = {
  industry?: string | null;
  sector?: string | null;
  name?: string | null;
  symbol?: string | null;
};

export function isEtfCompany(company?: CompanyLike | null): boolean {
  if (!company) return false;

  const industry = company.industry?.toLowerCase() ?? "";
  const sector = company.sector?.toLowerCase() ?? "";
  if (industry.includes("exchange traded fund") || industry === "etf") {
    return true;
  }
  if (sector === "etf") {
    return true;
  }

  const name = company.name?.toLowerCase() ?? "";
  if (name.includes(" etf") || name.endsWith("etf")) {
    return true;
  }

  const symbol = company.symbol?.toUpperCase() ?? "";
  if (symbol.endsWith(".ETF") || symbol.startsWith("ETF")) {
    return true;
  }

  return false;
}

