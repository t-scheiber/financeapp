import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { ensureUserByEmail } from "@/lib/services/users";
import { getApiKeyStatus } from "@/lib/services/user-api-keys";
import { createWatchlist, getUserWatchlists } from "@/lib/services/watchlists";

export async function GET() {
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

    const watchlists = await getUserWatchlists(user.id);

    return NextResponse.json(watchlists);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch watchlists";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();

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

    const apiKeyStatus = await getApiKeyStatus(user.id);
    if (!apiKeyStatus.hasAll) {
      return NextResponse.json(
        {
          error:
            "Add all required API keys (Alpha Vantage, NewsAPI, Hugging Face) before creating watchlists.",
          missingProviders: apiKeyStatus.missingProviders,
        },
        { status: 400 },
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
    const message =
      error instanceof Error ? error.message : "Failed to create watchlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
