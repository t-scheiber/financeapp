import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { ensureUserByEmail } from "@/lib/services/users";
import {
  getWatchlist,
  removeCompanyFromWatchlist,
} from "@/lib/services/watchlists";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ watchlistId: string; companyId: string }> },
) {
  try {
    const { watchlistId, companyId } = await params;
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

    const companyIdNumber = Number.parseInt(companyId, 10);
    if (Number.isNaN(companyIdNumber)) {
      return NextResponse.json(
        { error: "Invalid company id" },
        { status: 400 },
      );
    }

    await removeCompanyFromWatchlist(watchlist.id, companyIdNumber);
    const updated = await getWatchlist(watchlist.id);

    return NextResponse.json({ success: true, watchlist: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove symbol";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
