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
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/pwa-icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/pwa-icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      // iPhone (standard)
      { url: "/apple-touch-icon-120.png", sizes: "120x120" },
      // iPhone Retina
      { url: "/apple-touch-icon-180.png", sizes: "180x180" },
      // iPad
      { url: "/apple-touch-icon-152.png", sizes: "152x152" },
      // iPad Pro
      { url: "/apple-touch-icon-167.png", sizes: "167x167" },
      // Default apple-touch-icon (iOS will use this if no specific size matches)
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
  },
  formatDetection: {
    telephone: false,
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
        {/* PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FinanceApp" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Apple Touch Icons for different devices */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180.png" />
        
        {/* Mask icon for Safari pinned tabs */}
        <link rel="mask-icon" href="/icon.svg" color="#040711" />
        
        {/* Microsoft Tiles */}
        <meta name="msapplication-TileColor" content="#040711" />
        <meta name="msapplication-TileImage" content="/pwa-icon-192.png" />
        <meta name="msapplication-config" content="none" />
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
