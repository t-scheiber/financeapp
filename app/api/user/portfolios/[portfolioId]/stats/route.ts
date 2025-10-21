import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { prisma } from "@/lib/db";
import { getPortfolioStats } from "@/lib/services/forecasting";
import { ensureUserByEmail } from "@/lib/services/users";

export async function GET(
  _request: Request,
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

    const stats = await getPortfolioStats(portfolioId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching portfolio stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio stats" },
      { status: 500 },
    );
  }
}
