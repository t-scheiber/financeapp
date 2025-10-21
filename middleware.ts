import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user;
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
    return null;
  }

  // Allow cron endpoint for automated data refresh
  if (pathname.startsWith("/api/cron")) {
    return null;
  }

  // Allow public routes
  if (isPublicRoute) {
    return null;
  }

  // Protect all other routes - redirect to sign in if not authenticated
  if (!isLoggedIn) {
    return Response.redirect(new URL("/auth/signin", req.url));
  }

  // User is authenticated, allow access
  return null;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)",
  ],
};
