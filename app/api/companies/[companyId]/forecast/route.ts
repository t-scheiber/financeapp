import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import {
  compareWithMarket,
  forecastPrices,
  forecastWithSentiment,
  getMarketIndices,
} from "@/lib/services/forecasting";
import { ensureUserByEmail } from "@/lib/services/users";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ companyId: string }> },
) {
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

    const { companyId } = await params;
    const companyIdNumber = Number.parseInt(companyId, 10);
    if (Number.isNaN(companyIdNumber)) {
      return NextResponse.json(
        { error: "Invalid company id" },
        { status: 400 },
      );
    }

    const [forecast, sentimentForecast, marketInsights, marketIndices] =
      await Promise.all([
        forecastPrices(companyIdNumber, 5),
        forecastWithSentiment(companyIdNumber, 5),
        compareWithMarket(companyIdNumber, 30),
        getMarketIndices(),
      ]);

    return NextResponse.json({
      forecast,
      sentimentForecast,
      marketInsights,
      marketIndices,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate forecast";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
