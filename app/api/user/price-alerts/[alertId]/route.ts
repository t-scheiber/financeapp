import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { deletePriceAlert } from "@/lib/services/price-alerts";
import { ensureUserByEmail } from "@/lib/services/users";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ alertId: string }> },
) {
  try {
    const { alertId } = await params;

    if (!alertId) {
      return NextResponse.json(
        { error: "Alert id is required" },
        { status: 400 },
      );
    }

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

    const deleted = await deletePriceAlert(user.id, alertId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Price alert not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete price alert";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
