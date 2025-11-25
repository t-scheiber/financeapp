"use client";

import Image from "next/image";
import { signIn, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// SVG icons for sign-in providers
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}

export default function SignIn() {
  const { data: session, isPending } = useSession();
  const [isSigningIn, setIsSigningIn] = useState<"google" | "apple" | null>(null);

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
    setIsSigningIn("google");
    await signIn.social({
      provider: "google",
      callbackURL: "/",
    });
  };

  const handleAppleSignIn = async () => {
    setIsSigningIn("apple");
    await signIn.social({
      provider: "apple",
      callbackURL: "/",
    });
  };

  // Show loading while checking session
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-fade-in-up">
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
              <Image
                src="/icon.svg"
                alt="FinanceApp"
                width={40}
                height={40}
                className="opacity-50"
              />
            </div>
            <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-2 border-transparent border-t-accent" />
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render sign-in form if already signed in
  if (session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-fade-in-up">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-8 animate-fade-in-up">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 dark:bg-accent/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-accent)_0%,transparent_70%)] opacity-30 animate-float-soft" />
            <Image
              src="/icon.svg"
              alt="FinanceApp logo"
              width={52}
              height={52}
              priority
              className="relative z-10"
            />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
            Sign in to Finance App
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Access your personalized financial dashboard
          </p>
        </div>
        
        <div className="mt-8 space-y-3">
          <Button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn !== null}
            className="w-full h-12 flex items-center justify-center gap-3 rounded-xl shadow-sm text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isSigningIn === "google" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GoogleIcon className="h-5 w-5" />
            )}
            Continue with Google
          </Button>
          
          {isProduction ? (
            <Button
              onClick={handleAppleSignIn}
              disabled={isSigningIn !== null}
              variant="outline"
              className="w-full h-12 flex items-center justify-center gap-3 rounded-xl shadow-sm text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSigningIn === "apple" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <AppleIcon className="h-5 w-5" />
              )}
              Continue with Apple
            </Button>
          ) : (
            <div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3.5 text-center backdrop-blur-sm">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <AppleIcon className="h-4 w-4 opacity-50" />
                <span>
                  <span className="font-medium text-foreground">Apple Sign-In</span> is only available in production
                </span>
              </div>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Apple doesn&apos;t support localhost domains
              </p>
            </div>
          )}

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground/70">
                Secure authentication
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-6 text-xs text-muted-foreground">
            <a
              href="/privacy-policy"
              className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Privacy Policy
            </a>
            <span className="text-muted-foreground/30">•</span>
            <a
              href="/terms-of-service"
              className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
