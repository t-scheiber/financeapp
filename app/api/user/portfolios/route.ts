import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { createPortfolio, getUserPortfolios } from "@/lib/services/portfolios";
import { ensureUserByEmail } from "@/lib/services/users";

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
    console.error("Error fetching portfolios:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolios" },
      { status: 500 },
    );
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
    console.error("Error creating portfolio:", error);
    return NextResponse.json(
      { error: "Failed to create portfolio" },
      { status: 500 },
    );
  }
}
