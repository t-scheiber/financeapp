import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Get the current session on the server
 * Returns null if session is invalid or expired
 */
export async function getServerSession() {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });
    return session;
  } catch (error) {
    // Session is invalid or expired
    console.error("Error getting session:", error);
    return null;
  }
}

