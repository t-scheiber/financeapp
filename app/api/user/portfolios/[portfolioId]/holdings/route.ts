import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { prisma } from "@/lib/db";
import { resolveOrCreateCompany } from "@/lib/services/company-resolver";
import { addHolding, getPortfolio } from "@/lib/services/portfolios";
import { ensureUserByEmail } from "@/lib/services/users";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ portfolioId: string }> },
) {
  try {
    const { portfolioId } = await params;
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      symbol?: string;
      isin?: string;
      weight?: number;
      label?: string;
    } | null;

    const rawSymbol =
      typeof body?.symbol === "string" ? body.symbol.trim() : "";
    const rawIsin = typeof body?.isin === "string" ? body.isin.trim() : "";
    const weight = typeof body?.weight === "number" ? body.weight : undefined;

    if (!rawSymbol && !rawIsin) {
      return NextResponse.json(
        { error: "Symbol or ISIN is required" },
        { status: 400 },
      );
    }

    // Validate ISIN format if provided
    if (rawIsin) {
      const isinPattern = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
      if (!isinPattern.test(rawIsin)) {
        return NextResponse.json(
          {
            error:
              "Invalid ISIN format. Expected format: 2 letters + 9 alphanumeric + 1 digit (e.g., US0378331005)",
          },
          { status: 400 },
        );
      }
    }

    if (typeof weight !== "number" || Number.isNaN(weight) || weight <= 0) {
      return NextResponse.json(
        { error: "Weight must be greater than zero" },
        { status: 400 },
      );
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

    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      select: { id: true, userId: true },
    });

    if (!portfolio || portfolio.userId !== user.id) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 },
      );
    }

    const company = await resolveOrCreateCompany({
      symbol: rawSymbol || rawIsin,
      fallbackName:
        typeof body?.label === "string" ? body.label.trim() : undefined,
    });

    await addHolding(portfolioId, company.id, weight);

    const updated = await getPortfolio(portfolioId);
    return NextResponse.json({ success: true, portfolio: updated });
  } catch (error) {
    console.error("Error adding holding:", error);
    return NextResponse.json(
      { error: "Failed to add holding" },
      { status: 500 },
    );
  }
}
