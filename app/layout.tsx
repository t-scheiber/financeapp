import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { DesignProvider } from "@/components/design-provider";
import { FeatureToggleProvider } from "@/components/feature-toggle-provider";
import { Header } from "@/components/header";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

// Optimized font loading with subset and display swap
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://financeapp.local";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: "FinanceApp",
  title: "FinanceApp – Financial Data & News Dashboard",
  description:
    "Track watchlists, portfolios, alerts, and curated news across devices with a responsive PWA experience.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "FinanceApp",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", rel: "icon", sizes: "any" },
      {
        url: "/pwa-icon-192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        url: "/pwa-icon-512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6fb" },
    { media: "(prefers-color-scheme: dark)", color: "#040711" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} min-h-screen bg-background font-sans text-foreground antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <DesignProvider>
            <FeatureToggleProvider>
              <div className="app-shell">
                <div className="app-backdrop" aria-hidden="true" />
                <div className="grid-overlay" aria-hidden="true" />
                <AuthProvider>
                  <PwaProvider />
                  <Header />
                  <main className="relative z-10 flex-1 pb-16">{children}</main>
                </AuthProvider>
              </div>
              <Toaster position="bottom-right" richColors closeButton />
            </FeatureToggleProvider>
          </DesignProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
