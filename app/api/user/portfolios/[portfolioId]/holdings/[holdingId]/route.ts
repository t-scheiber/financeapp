import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import {
  getPortfolio,
  removeHolding,
  updateHolding,
} from "@/lib/services/portfolios";
import { ensureUserByEmail } from "@/lib/services/users";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ portfolioId: string; holdingId: string }> },
) {
  try {
    const { portfolioId, holdingId } = await params;
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      weight?: number;
    } | null;
    const weight = typeof body?.weight === "number" ? body.weight : undefined;

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

    const holding = await prisma.holding.findUnique({
      where: { id: holdingId },
      select: { portfolioId: true, portfolio: { select: { userId: true } } },
    });

    if (
      !holding ||
      holding.portfolioId !== portfolioId ||
      holding.portfolio.userId !== user.id
    ) {
      return NextResponse.json({ error: "Holding not found" }, { status: 404 });
    }

    await updateHolding(holdingId, weight);
    const updated = await getPortfolio(portfolioId);
    return NextResponse.json({ success: true, portfolio: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update holding";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ portfolioId: string; holdingId: string }> },
) {
  try {
    const { portfolioId, holdingId } = await params;
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

    const holding = await prisma.holding.findUnique({
      where: { id: holdingId },
      select: { portfolioId: true, portfolio: { select: { userId: true } } },
    });

    if (
      !holding ||
      holding.portfolioId !== portfolioId ||
      holding.portfolio.userId !== user.id
    ) {
      return NextResponse.json({ error: "Holding not found" }, { status: 404 });
    }

    await removeHolding(holdingId);
    const updated = await getPortfolio(portfolioId);
    return NextResponse.json({ success: true, portfolio: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete holding";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
