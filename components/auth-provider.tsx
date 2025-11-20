"use client";

// Better Auth doesn't require a provider wrapper
// The auth client is imported directly where needed
interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return <>{children}</>;
}
