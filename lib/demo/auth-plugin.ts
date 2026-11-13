import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { basePrisma } from "@/lib/db";
import {
  DEMO_SIGN_IN_PATH,
  DEMO_USER_EMAIL,
  DEMO_USER_ID,
  DEMO_USER_NAME,
} from "@/lib/demo/config";
import { ensureDemoData } from "@/lib/demo/seed";

const SESSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Better Auth plugin with one endpoint, POST /api/auth/demo/sign-in. It signs
 * the caller in as the shared demo user without credentials. The demo user
 * exists in the real database only so Better Auth can hold its sessions; its
 * data lives in the separate demo database (see lib/db.ts).
 */
export const demoSignIn = () =>
  ({
    id: "demo-sign-in",
    endpoints: {
      demoSignIn: createAuthEndpoint(
        DEMO_SIGN_IN_PATH,
        { method: "POST" },
        async (ctx) => {
          await ensureDemoData();

          await basePrisma.user.upsert({
            where: { id: DEMO_USER_ID },
            update: {},
            create: {
              id: DEMO_USER_ID,
              email: DEMO_USER_EMAIL,
              name: DEMO_USER_NAME,
              emailVerified: true,
              hasSeenGuide: true,
            },
          });

          // Demo sessions last one day. Delete them a week after they expire,
          // so they do not pile up but a stale tab still maps to the demo data.
          await basePrisma.session.deleteMany({
            where: {
              userId: DEMO_USER_ID,
              expiresAt: { lt: new Date(Date.now() - SESSION_RETENTION_MS) },
            },
          });

          const user =
            await ctx.context.internalAdapter.findUserById(DEMO_USER_ID);
          // dontRememberMe = true: one-day session and a browser-session cookie.
          const session = user
            ? await ctx.context.internalAdapter.createSession(user.id, true)
            : null;
          if (!user || !session) {
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Could not start a demo session.",
            });
          }

          await setSessionCookie(ctx, { session, user }, true);
          return ctx.json({ success: true });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
