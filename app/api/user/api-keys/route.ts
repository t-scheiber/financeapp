import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import {
  getUserApiKeys,
  setUserApiKey,
  validateApiKey,
} from "@/lib/services/user-api-keys";
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

    const apiKeys = await getUserApiKeys(user.id);

    const response = apiKeys.map((key) => ({
      id: key.id,
      provider: key.provider,
      isValid: key.isValid,
      lastTested: key.lastTested ?? null,
    }));

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch API keys";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      provider?: string;
      apiKey?: string;
    };

    const provider = body.provider ?? "";
    const trimmedApiKey =
      typeof body.apiKey === "string" ? body.apiKey.trim() : "";

    if (!provider || !trimmedApiKey) {
      return NextResponse.json(
        { error: "Provider and API key are required" },
        { status: 400 },
      );
    }

    const allowedProviders = [
      "alpha_vantage",
      "newsapi",
      "huggingface",
    ] as const;
    type AllowedProvider = (typeof allowedProviders)[number];

    if (!allowedProviders.includes(provider as AllowedProvider)) {
      return NextResponse.json(
        { error: "Unsupported provider" },
        { status: 400 },
      );
    }

    const typedProvider = provider as AllowedProvider;

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

    // Set the API key
    const success = await setUserApiKey(user.id, typedProvider, trimmedApiKey);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to save API key" },
        { status: 500 },
      );
    }

    // Validate the API key
    const validation = await validateApiKey(user.id, typedProvider);

    return NextResponse.json({
      success: true,
      validation,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to set API key";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
