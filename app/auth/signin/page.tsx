"use client";

import Image from "next/image";
import { signIn, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function SignIn() {
  const { data: session, isPending } = useSession();

  // Check if we're in production (Apple Sign-In only works with real domains)
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://");

  useEffect(() => {
    // If user is already signed in, redirect to dashboard
    if (!isPending && session?.user) {
      // Use window.location for a hard redirect to avoid routing issues
      window.location.href = "/";
    }
  }, [session, isPending]);

  const handleGoogleSignIn = async () => {
    await signIn.social({
      provider: "google",
      callbackURL: "/",
    });
  };

  const handleAppleSignIn = async () => {
    await signIn.social({
      provider: "apple",
      callbackURL: "/",
    });
  };

  // Don't render sign-in form if already signed in
  if (session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 dark:bg-accent/20">
            <Image
              src="/icon.svg"
              alt="FinanceApp logo"
              width={48}
              height={48}
              priority
            />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-foreground">
            Sign in to Finance App
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Access our financial dashboard
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
          >
            Sign in with Google
          </Button>
          
          {isProduction ? (
            <Button
              onClick={handleAppleSignIn}
              className="w-full flex justify-center py-2 px-4 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-card hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
            >
              Sign in with Apple
            </Button>
          ) : (
            <div className="rounded-md border border-border/50 bg-muted/30 px-4 py-3 text-center">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Apple Sign-In</span> is only available in production
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Apple doesn&apos;t support localhost domains
              </p>
            </div>
          )}

          <div className="text-center pt-4 border-t border-border">
            <div className="flex justify-center space-x-6 text-sm">
              <a
                href="/privacy-policy"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </a>
              <span className="text-muted-foreground/50">|</span>
              <a
                href="/terms-of-service"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
