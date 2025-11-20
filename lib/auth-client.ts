"use client";

import { createAuthClient } from "better-auth/react";

const envBaseURL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

export const authClient = createAuthClient({
  baseURL: envBaseURL,
  basePath: "/api/auth",
  // Fetch session immediately on mount
  fetchOnMount: true,
});

export const { signIn, signOut, useSession } = authClient;

// Helper to get session data (for convenience)
export function useAuthSession() {
  const { data: session, isPending } = useSession();
  return { session, isPending };
}

