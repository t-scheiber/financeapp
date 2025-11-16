import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { prisma } from "@/lib/db";

// Detect if we're in production (HTTPS environment)
const isProduction = process.env.NODE_ENV === "production" ||
                     process.env.BETTER_AUTH_URL?.startsWith("https://") ||
                     process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://");

// Debug logging for Apple Sign-In configuration
if (process.env.NODE_ENV === "production") {
  console.log("🍎 Apple Sign-In Configuration:", {
    clientId: process.env.APPLE_CLIENT_ID,
    hasSecret: !!process.env.APPLE_CLIENT_SECRET,
    secretLength: process.env.APPLE_CLIENT_SECRET?.length,
    redirectUri: process.env.APPLE_REDIRECT_URI,
    baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
    isProduction,
    cookieDomain: process.env.BETTER_AUTH_URL 
      ? new URL(process.env.BETTER_AUTH_URL).hostname.replace(/^www\./, '').split(':')[0]
      : undefined,
  });
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),
  emailAndPassword: {
    enabled: false, // Only using OAuth providers
  },
  socialProviders: {
    google: {
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID ?? "",
      clientSecret: process.env.APPLE_CLIENT_SECRET ?? "",
      appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER,
      // Explicitly set the redirect URI (Better Auth default: {baseURL}/api/auth/callback/apple)
      redirectURI: process.env.APPLE_REDIRECT_URI,
    },
  },
  trustedOrigins: ["https://appleid.apple.com"],
  secret: process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET ?? "",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  basePath: "/api/auth",
  session: {
    expiresIn: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
    cookieCache: {
      enabled: false, // Disable cookie cache for now
    },
  },
  advanced: {
    // Automatically use secure cookies in production (HTTPS)
    useSecureCookies: isProduction,
    defaultCookieAttributes: {
      sameSite: "lax",
      path: "/",
      httpOnly: true,
      // Secure cookies only on HTTPS (production)
      secure: isProduction,
      // Explicitly set domain in production to handle www/non-www
      // This ensures cookies work across the entire domain
      domain: isProduction && process.env.BETTER_AUTH_URL 
        ? new URL(process.env.BETTER_AUTH_URL).hostname.replace(/^www\./, '').split(':')[0]
        : undefined,
    },
  },
  rateLimit: {
    // Enable rate limiting in production
    enabled: isProduction,
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Check email allowlist after social sign-in callback
      if (ctx.path?.startsWith("/callback/") && ctx.context.newSession?.user?.email) {
        const allowedEmails = (
          process.env.ALLOWED_EMAILS?.split(",") || []
        ).map((email) => email.trim().toLowerCase());

        if (allowedEmails.length > 0) {
          const userEmail = ctx.context.newSession.user.email.toLowerCase();
          if (!allowedEmails.includes(userEmail)) {
            console.log(`Sign-in attempt blocked for email: ${userEmail}`);
            const userId = ctx.context.newSession?.user?.id;
            
            // Delete the session that was just created
            if (ctx.context.newSession?.session?.id) {
              await prisma.session.delete({
                where: { id: ctx.context.newSession.session.id },
              }).catch(() => {
                // Ignore errors if session doesn't exist
              });
            }
            
            // Delete the account that was just created
            if (userId) {
              await prisma.account.deleteMany({
                where: { userId },
              }).catch(() => {
                // Ignore errors
              });
            }
            
            // Delete the user that was just created
            if (userId) {
              await prisma.user.delete({
                where: { id: userId },
              }).catch(() => {
                // Ignore errors if user doesn't exist
              });
            }
            throw new APIError("UNAUTHORIZED", {
              message: "Access denied. Your email is not authorized.",
            });
          }
        }
      }
    }),
  },
});

