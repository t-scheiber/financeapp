import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { createPortfolio, getUserPortfolios } from "@/lib/services/portfolios";
import { ensureUserByEmail } from "@/lib/services/users";
import { getApiKeyStatus } from "@/lib/services/user-api-keys";

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

    const portfolios = await getUserPortfolios(user.id);

    return NextResponse.json(portfolios);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch portfolios";
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
    const portfolioName = typeof name === "string" ? name.trim() : "";

    if (!portfolioName) {
      return NextResponse.json(
        { error: "Portfolio name is required" },
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
            "Add all required API keys (Alpha Vantage, NewsAPI, Hugging Face) before creating portfolios.",
          missingProviders: apiKeyStatus.missingProviders,
        },
        { status: 400 },
      );
    }

    const portfolio = await createPortfolio(user.id, portfolioName);

    if (!portfolio) {
      return NextResponse.json(
        { error: "Failed to create portfolio" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      portfolio,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create portfolio";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
