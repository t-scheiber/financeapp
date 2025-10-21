import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { prisma } from "@/lib/db";
import { optimisePortfolioEqualWeight } from "@/lib/services/portfolios";
import { ensureUserByEmail } from "@/lib/services/users";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ portfolioId: string }> },
) {
  try {
    const { portfolioId } = await params;
    const session = await auth();

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

    const updated = await optimisePortfolioEqualWeight(portfolioId);

    if (!updated) {
      return NextResponse.json(
        { error: "Unable to optimise portfolio" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, portfolio: updated });
  } catch (error) {
    console.error("Error optimising portfolio:", error);
    return NextResponse.json(
      { error: "Failed to optimise portfolio" },
      { status: 500 },
    );
  }
}
