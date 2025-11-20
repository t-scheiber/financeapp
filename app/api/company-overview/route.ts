import { type NextRequest, NextResponse } from "next/server";
import { getDashboardSnapshot } from "@/lib/services/dashboard";

export async function GET(_request: NextRequest) {
  try {
    const snapshot = await getDashboardSnapshot();
    return NextResponse.json({
      companies: snapshot,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load company overview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

