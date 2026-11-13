// Shared demo constants. This file has no server-only imports, so client
// components (sign-in page, header) can use it as well.

export const DEMO_USER_ID = "demo-user";
// .invalid is reserved (RFC 2606) and never resolves, so no mail can reach it.
export const DEMO_USER_EMAIL = "demo@demo.invalid";
export const DEMO_USER_NAME = "Demo user";

export const DEMO_SIGN_IN_PATH = "/demo/sign-in";

export const DEMO_READ_ONLY_MESSAGE =
  "The demo is read-only. Changes are disabled for the shared demo account.";

export function isDemoEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === DEMO_USER_EMAIL;
}

// Cookie names used by Better Auth with cookiePrefix "better-auth" (see
// lib/auth.ts). In production the cookie carries the __Secure- prefix.
export const SESSION_COOKIE_NAMES = [
  "__Secure-better-auth.session_token",
  "better-auth.session_token",
] as const;

/**
 * Extract the session token from a Better Auth session cookie value. The
 * cookie holds "<token>.<signature>"; the token is what the sessions table
 * stores. Returns null if no session cookie is present.
 */
export function readSessionToken(
  getCookie: (name: string) => string | undefined,
): string | null {
  for (const name of SESSION_COOKIE_NAMES) {
    const raw = getCookie(name);
    if (!raw) continue;
    const value = decodeURIComponent(raw);
    const token = value.split(".")[0];
    if (token) return token;
  }
  return null;
}
