import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { resolveSymbolFromIsin } from "@/lib/services/company-resolver";
import { FinancialAPI } from "@/lib/services/financial-api";
import { getUserApiKey } from "@/lib/services/user-api-keys";
import { ensureUserByEmail } from "@/lib/services/users";
import { isEtfCompany } from "@/lib/utils/company";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await ensureUserByEmail({
      email: session.user.email,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
    });

    if (!user) {
      return NextResponse.json(
        { error: "Unable to resolve user" },
        { status: 500 },
      );
    }

    const { companyId } = await params;
    const company = await prisma.company.findUnique({
      where: { id: Number.parseInt(companyId, 10) },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (isEtfCompany(company)) {
      return NextResponse.json({
        dividends: [],
        info: "Dividend lookups are skipped for ETFs because payouts vary by fund provider.",
      });
    }

    const alphaKey =
      (await getUserApiKey(user.id, "alpha_vantage")) ??
      process.env.ALPHA_VANTAGE_API_KEY ??
      "";

    if (!alphaKey) {
      return NextResponse.json(
        {
          error:
            "Alpha Vantage API key is not configured. Add a key in Settings to load dividends.",
        },
        { status: 400 },
      );
    }

    // Resolve ISIN placeholder symbols before fetching dividends
    let symbolToUse = company.symbol;
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

    // If still a placeholder symbol, can't fetch dividends
    if (symbolToUse.startsWith("ISIN-")) {
      return NextResponse.json({
        dividends: [],
        info: "Unable to resolve ticker symbol from ISIN. Please add the company using its ticker symbol.",
      });
    }

    const financialApi = new FinancialAPI(alphaKey);
    const dividends = await financialApi.getDividends(symbolToUse);

    return NextResponse.json({ dividends: dividends.dividends });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch dividends";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
