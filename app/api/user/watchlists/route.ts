import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { ensureUserByEmail } from "@/lib/services/users";
import { createWatchlist, getUserWatchlists } from "@/lib/services/watchlists";

export async function GET() {
  try {
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

    const watchlists = await getUserWatchlists(user.id);

    return NextResponse.json(watchlists);
  } catch (error) {
    console.error("Error fetching watchlists:", error);
    return NextResponse.json(
      { error: "Failed to fetch watchlists" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();
    const watchlistName = typeof name === "string" ? name.trim() : "";

    if (!watchlistName) {
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

    const watchlist = await createWatchlist(user.id, watchlistName);

    if (!watchlist) {
      return NextResponse.json(
        { error: "Failed to create watchlist" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      watchlist,
    });
  } catch (error) {
    console.error("Error creating watchlist:", error);
    return NextResponse.json(
      { error: "Failed to create watchlist" },
      { status: 500 },
    );
  }
}
