import type { MetadataRoute } from "next";

const APP_NAME = "FinanceApp";
const APP_DESCRIPTION =
  "Responsive financial dashboard with watchlists, portfolios, alerts, and curated news.";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "financeapp-pwa",
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#040711",
    theme_color: "#040711",
    categories: ["finance", "productivity"],
    prefer_related_applications: false,
    icons: [
      // SVG icon for modern browsers (scales to any size)
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      // PNG icons for PWA
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Maskable icons for Android adaptive icons
      {
        src: "/pwa-icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/pwa-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/screenshot-wide.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "FinanceApp Dashboard",
      },
      {
        src: "/screenshot-narrow.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
        label: "FinanceApp Mobile",
      },
    ],
  };
}


