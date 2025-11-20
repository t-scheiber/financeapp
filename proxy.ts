import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "better-auth.session_token";
const SECURE_SESSION_COOKIE_NAME = `__Secure-${SESSION_COOKIE_NAME}`;

export default async function proxy(req: NextRequest) {
  // Check if the session cookie exists (including secure cookies in production)
  const sessionCookie =
    req.cookies.get(SESSION_COOKIE_NAME) ??
    req.cookies.get(SECURE_SESSION_COOKIE_NAME);
  const isLoggedIn = !!sessionCookie;
  const pathname = req.nextUrl.pathname;

  // Public routes that don't require authentication
  const publicRoutes = [
    "/terms-of-service",
    "/privacy-policy",
    "/auth/signin",
    "/auth/error",
  ];

  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // Allow all auth-related routes (including OAuth callbacks)
  if (pathname.startsWith("/auth") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow cron endpoint for automated data refresh
  if (pathname.startsWith("/api/cron")) {
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Protect all other routes - redirect to sign in if not authenticated
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  // User is authenticated, allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)",
  ],
};

