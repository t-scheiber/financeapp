import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { prisma } from "@/lib/db";

function normaliseUrl(input?: string | null) {
  if (!input) return null;
  const candidate = input.match(/^https?:\/\//i) ? input : `https://${input}`;

  try {
    const url = new URL(candidate);
    const pathname =
      url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    return `${url.origin}${pathname}`;
  } catch {
    return null;
  }
}

function resolveAppURL() {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.AUTH_URL,
    process.env.SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ];

  for (const candidate of candidates) {
    const normalised = normaliseUrl(candidate);
    if (normalised) return normalised;
  }

  if (process.env.NODE_ENV !== "production") {
    const port = process.env.PORT ?? "3000";
    return `http://localhost:${port}`;
  }

  throw new Error(
    "NEXT_PUBLIC_APP_URL (or APP_URL) must be set to a fully-qualified URL.",
  );
}

const appURL = resolveAppURL();

// Only use secure cookies when we're running a production build on HTTPS.
const isSecureEnvironment =
  process.env.NODE_ENV === "production" && appURL.startsWith("https://");

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
      mapProfileToUser: (profile) => {
        return {
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID ?? "",
      clientSecret: process.env.APPLE_CLIENT_SECRET ?? "",
      appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER,
      // Explicitly set the redirect URI (Better Auth default: {baseURL}/api/auth/callback/apple)
      redirectURI: process.env.APPLE_REDIRECT_URI,
      mapProfileToUser: (profile) => {
        // Apple provides name in profile.name on first sign-in only
        // It can be an object with firstName and lastName, or a string
        let fullName: string | null = null;

        if (profile.name) {
          if (typeof profile.name === "string") {
            fullName = profile.name;
          } else if (
            typeof profile.name === "object" &&
            profile.name !== null
          ) {
            // Apple sometimes sends name as { firstName: "John", lastName: "Doe" }
            const nameObj = profile.name as {
              firstName?: string;
              lastName?: string;
            };
            fullName = [nameObj.firstName, nameObj.lastName]
              .filter(Boolean)
              .join(" ");
          }
        }

        return {
          name: fullName || profile.email?.split("@")[0] || "User", // Fallback to email username or "User"
          email: profile.email,
        };
      },
    },
  },
  trustedOrigins: ["https://appleid.apple.com", appURL].filter(Boolean),
  secret: process.env.AUTH_SECRET ?? "",
  baseURL: appURL,
  basePath: "/api/auth",
  session: {
    expiresIn: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache for 5 minutes
    },
  },
  advanced: {
    // Use secure cookies in production (HTTPS) - Better Auth handles the rest
    useSecureCookies: isSecureEnvironment,
    // For OAuth with Apple, we need SameSite=None in production to handle cross-site redirects
    cookiePrefix: "better-auth",
    defaultCookieAttributes: {
      sameSite: isSecureEnvironment ? "none" : "lax", // "none" for production (Apple OAuth), "lax" for dev
      secure: isSecureEnvironment,
      httpOnly: true,
      path: "/",
    },
  },
  rateLimit: {
    // Enable rate limiting in production
    enabled: isSecureEnvironment,
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Check email allowlist after social sign-in callback
      if (
        ctx.path?.startsWith("/callback/") &&
        ctx.context.newSession?.user?.email
      ) {
        const user = ctx.context.newSession.user;

        const allowedEmails = (
          process.env.ALLOWED_EMAILS?.split(",") || []
        ).map((email) => email.trim().toLowerCase());

        if (allowedEmails.length > 0) {
          const userEmail = user.email.toLowerCase();
          if (!allowedEmails.includes(userEmail)) {
            const userId = user.id;

            // Delete the session that was just created
            if (ctx.context.newSession?.session?.id) {
              await prisma.session
                .delete({
                  where: { id: ctx.context.newSession.session.id },
                })
                .catch(() => {
                  // Ignore errors if session doesn't exist
                });
            }

            // Delete the account that was just created
            if (userId) {
              await prisma.account
                .deleteMany({
                  where: { userId },
                })
                .catch(() => {
                  // Ignore errors
                });
            }

            // Delete the user that was just created
            if (userId) {
              await prisma.user
                .delete({
                  where: { id: userId },
                })
                .catch(() => {
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
