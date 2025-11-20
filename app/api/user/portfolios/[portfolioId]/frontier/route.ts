import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { buildEfficientFrontier, OptimizerUserError } from "@/lib/services/portfolio-optimizer";
import { getPortfolio } from "@/lib/services/portfolios";
import { ensureUserByEmail } from "@/lib/services/users";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ portfolioId: string }> },
) {
  try {
    const { portfolioId } = await params;
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

    const portfolioRecord = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      select: { id: true, userId: true },
    });

    if (!portfolioRecord || portfolioRecord.userId !== user.id) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 },
      );
    }

    const optimized = await buildEfficientFrontier(portfolioId);
    const updated = await getPortfolio(portfolioId);

    if (!updated) {
      return NextResponse.json(
        { error: "Unable to load updated portfolio" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      optimized: {
        ...optimized,
        calculatedAt: optimized.calculatedAt.toISOString(),
      },
      portfolio: updated,
    });
  } catch (error) {
    if (error instanceof OptimizerUserError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "Failed to build efficient frontier";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

