import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import {
  getNotificationPreference,
  updateNotificationPreference,
} from "@/lib/services/notifications";
import { ensureUserByEmail } from "@/lib/services/users";

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

    const preference = await getNotificationPreference(user.id);

    return NextResponse.json(preference);
  } catch (error) {
    console.error("Error fetching notification preference:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification preference" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      emailEnabled?: boolean;
    } | null;

    if (typeof body?.emailEnabled !== "boolean") {
      return NextResponse.json(
        { error: "emailEnabled boolean required" },
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

    const updated = await updateNotificationPreference(
      user.id,
      body.emailEnabled,
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating notification preference:", error);
    return NextResponse.json(
      { error: "Failed to update notification preference" },
      { status: 500 },
    );
  }
}
