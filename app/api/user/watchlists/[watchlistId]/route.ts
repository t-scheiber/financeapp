import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { ensureUserByEmail } from "@/lib/services/users";
import { deleteWatchlist } from "@/lib/services/watchlists";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ watchlistId: string }> },
) {
  try {
    const { watchlistId } = await params;

    if (!watchlistId) {
      return NextResponse.json(
        { error: "Watchlist id is required" },
        { status: 400 },
      );
    }

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

    const watchlist = await prisma.watchlist.findUnique({
      where: { id: watchlistId },
      select: { id: true, userId: true },
    });

    if (!watchlist || watchlist.userId !== user.id) {
      return NextResponse.json(
        { error: "Watchlist not found" },
        { status: 404 },
      );
    }

    const success = await deleteWatchlist(watchlistId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete watchlist" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete watchlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ watchlistId: string }> },
) {
  try {
    const { watchlistId } = await params;
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      name?: string;
    } | null;
    const trimmedName = typeof body?.name === "string" ? body.name.trim() : "";

    if (!trimmedName) {
      return NextResponse.json(
        { error: "Watchlist name is required" },
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

    const watchlist = await prisma.watchlist.findUnique({
      where: { id: watchlistId },
      select: { id: true, userId: true },
    });

    if (!watchlist || watchlist.userId !== user.id) {
      return NextResponse.json(
        { error: "Watchlist not found" },
        { status: 404 },
      );
    }

    const updated = await prisma.watchlist.update({
      where: { id: watchlistId },
      data: { name: trimmedName },
      include: {
        companies: {
          include: {
            company: {
              select: {
                name: true,
                symbol: true,
                id: true,
                industry: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      watchlist: {
        id: updated.id,
        userId: updated.userId,
        name: updated.name,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        companies: updated.companies.map((wc) => ({
          id: wc.company.id,
          name: wc.company.name,
          symbol: wc.company.symbol,
          industry: wc.company.industry,
        })),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to rename watchlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
