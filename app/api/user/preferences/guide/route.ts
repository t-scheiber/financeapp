import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { ensureUserByEmail } from "@/lib/services/users";
import { prisma } from "@/lib/db";

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

    return NextResponse.json({ hasSeenGuide: user.hasSeenGuide });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load guide status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      hasSeenGuide?: boolean;
    } | null;

    if (typeof body?.hasSeenGuide !== "boolean") {
      return NextResponse.json(
        { error: "hasSeenGuide boolean required" },
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

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { hasSeenGuide: body.hasSeenGuide },
      select: { hasSeenGuide: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update guide status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

