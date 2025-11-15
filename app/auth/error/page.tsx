"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "AccessDenied":
      case "UNAUTHORIZED":
        return "Access denied. Your email address is not authorized to use this application.";
      case "Configuration":
        return "There is a problem with the server configuration.";
      default:
        return "There was a problem with your authentication. Please try again.";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-foreground">
            Authentication Error
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
          {(error === "AccessDenied" || error === "UNAUTHORIZED") && (
            <p className="mt-2 text-xs text-muted-foreground/80">
              If you believe this is an error, please contact your
              administrator.
            </p>
          )}
        </div>
        <div className="mt-8 space-y-6">
          <a
            href="/auth/signin"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
          >
            Try Again
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent"></div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
