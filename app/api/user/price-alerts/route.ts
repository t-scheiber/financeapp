import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import {
  createPriceAlert,
  getUserPriceAlerts,
  type PriceAlertDirection,
} from "@/lib/services/price-alerts";
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

    const alerts = await getUserPriceAlerts(user.id);
    return NextResponse.json(alerts);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch price alerts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      symbol?: string;
      direction?: PriceAlertDirection;
      threshold?: number;
      label?: string;
    } | null;

    const symbol =
      typeof body?.symbol === "string" ? body.symbol.trim().toUpperCase() : "";
    const direction =
      body?.direction === "below"
        ? "below"
        : body?.direction === "above"
          ? "above"
          : null;
    const threshold =
      typeof body?.threshold === "number" && Number.isFinite(body.threshold)
        ? body.threshold
        : null;

    if (!symbol || !direction || threshold === null) {
      return NextResponse.json(
        { error: "Symbol, direction, and numeric threshold are required" },
        { status: 400 },
      );
    }

    if (threshold <= 0) {
      return NextResponse.json(
        { error: "Threshold must be greater than zero" },
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
            "Add all required API keys (Alpha Vantage, NewsAPI, Hugging Face) before creating price alerts.",
          missingProviders: apiKeyStatus.missingProviders,
        },
        { status: 400 },
      );
    }

    const result = await createPriceAlert({
      userId: user.id,
      symbol,
      direction,
      threshold,
      displayName:
        typeof body?.label === "string" ? body.label.trim() : undefined,
    });

    if ("alreadyExists" in result) {
      return NextResponse.json(
        { success: true, alreadyExists: true, alert: result.alert },
        { status: 200 },
      );
    }

    return NextResponse.json({ success: true, alert: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create price alert";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
