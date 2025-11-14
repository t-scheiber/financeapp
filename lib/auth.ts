import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { prisma } from "@/lib/db";

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
    useSecureCookies: false, // Set to false for localhost development
    defaultCookieAttributes: {
      sameSite: "lax",
      path: "/",
      httpOnly: true,
      secure: false, // Must be false for localhost HTTP
    },
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

