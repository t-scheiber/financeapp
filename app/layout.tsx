import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { DesignProvider } from "@/components/design-provider";
import { FeatureToggleProvider } from "@/components/feature-toggle-provider";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "Finance App - Financial Data & News Dashboard",
  description:
    "An application to track stock prices, dividends, and news for selected companies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link
          rel="icon"
          href="/icon?<generated>"
          type="image/<generated>"
          sizes="<generated>"
        />
        <link rel="apple-touch-icon" href="/apple-icon?<generated>" />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <DesignProvider>
          <FeatureToggleProvider>
            <div className="app-shell">
              <div className="app-backdrop" aria-hidden="true" />
              <div className="grid-overlay" aria-hidden="true" />
              <AuthProvider>
                <Header />
                <main className="relative z-10 flex-1 pb-16">{children}</main>
              </AuthProvider>
            </div>
          </FeatureToggleProvider>
        </DesignProvider>
      </body>
    </html>
  );
}
