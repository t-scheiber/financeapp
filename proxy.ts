import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { isDemoSessionToken } from "@/lib/db";
import { DEMO_READ_ONLY_MESSAGE, readSessionToken } from "@/lib/demo/config";

const SESSION_COOKIE_NAME = "better-auth.session_token";
const SECURE_SESSION_COOKIE_NAME = `__Secure-${SESSION_COOKIE_NAME}`;

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Write requests the demo user may still make. Signing out and starting a new
// demo session only touch the demo user's own sessions. The frontier POST only
// computes and stores results in the demo database and calls no external API.
const DEMO_ALLOWED_WRITES = [
  /^\/api\/auth\/sign-out$/,
  /^\/api\/auth\/demo\/sign-in$/,
  /^\/api\/user\/portfolios\/[^/]+\/frontier$/,
];

/**
 * True if the demo user must not make this request: any write outside
 * DEMO_ALLOWED_WRITES, and the cron routes. Only checks the database when the
 * request is a write and carries a session cookie.
 */
async function isBlockedDemoRequest(req: NextRequest): Promise<boolean> {
  const pathname = req.nextUrl.pathname;
  const isCron = pathname.startsWith("/api/cron");
  const isWrite = !READ_METHODS.has(req.method);
  if (!isCron && !isWrite) return false;
  if (DEMO_ALLOWED_WRITES.some((pattern) => pattern.test(pathname))) {
    return false;
  }
  const token = readSessionToken((name) => req.cookies.get(name)?.value);
  if (!token) return false;
  return isDemoSessionToken(token);
}

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const sessionCookie =
    req.cookies.get(SESSION_COOKIE_NAME) ??
    req.cookies.get(SECURE_SESSION_COOKIE_NAME);
  if (!sessionCookie) return false;
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    return !!session?.user;
  } catch {
    return false;
  }
}

export default async function proxy(req: NextRequest) {
  if (await isBlockedDemoRequest(req)) {
    return NextResponse.json(
      { error: DEMO_READ_ONLY_MESSAGE },
      { status: 403 },
    );
  }

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

  // Protect all other routes. A cookie alone is not enough: the session it
  // names has to exist and be unexpired, or a made-up cookie would pass.
  if (!(await hasValidSession(req))) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
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

