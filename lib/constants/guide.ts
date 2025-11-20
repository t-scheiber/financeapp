import {
  CRON_INTERVAL_HOURS,
  GLOBAL_COMPANY_TARGET,
  PORTFOLIO_HOLDING_LIMIT,
  WATCHLIST_COMPANY_LIMIT,
} from "@/lib/constants/limits";

export interface QuickStartGuideStep {
  id: string;
  title: string;
  description: string;
  highlights?: string[];
  badge?: string;
  cta?: {
    label: string;
    href: string;
    external?: boolean;
  };
}

export const QUICK_START_GUIDE_STEPS: QuickStartGuideStep[] = [
  {
    id: "dashboard",
    badge: "Dashboard",
    title: "Stay ahead with scheduled snapshots",
    description: `We auto-refresh prices, news, and sentiment every ${CRON_INTERVAL_HOURS} hours across the top ${GLOBAL_COMPANY_TARGET} companies so you land on up-to-date data without hitting refresh.`,
    highlights: [
      "Filter instantly by ticker, ISIN, industry, or keyword.",
      "Open any card to deep dive into price history, dividends, and curated news sentiment.",
    ],
    cta: {
      label: "Go to dashboard",
      href: "/",
    },
  },
  {
    id: "watchlists",
    badge: "Watchlists",
    title: "Curate up to 20 primary symbols",
    description: `Each account can track ${WATCHLIST_COMPANY_LIMIT} tickers across all watchlists. Archiving older names keeps the cron budget focused on what matters.`,
    highlights: [
      "Rename lists inline and reorder holdings to mirror your mental model.",
      "We badge ETFs automatically so you never mix them up with single stocks.",
    ],
    cta: {
      label: "Open watchlists",
      href: "/settings#watchlists",
    },
  },
  {
    id: "portfolios",
    badge: "Portfolios",
    title: "Model strategies with fast optimisers",
    description: `Build portfolios with as many as ${PORTFOLIO_HOLDING_LIMIT} holdings. Fine-tune weights or use the equal-weight optimiser to refresh analytics instantly.`,
    highlights: [
      "Variance, Sharpe, and covariance stats recalc with every change.",
      "Use holdings tables to edit or remove individual tickers in place.",
    ],
    cta: {
      label: "Manage portfolios",
      href: "/settings#portfolios",
    },
  },
  {
    id: "apiKeys",
    badge: "API Keys",
    title: "Connect data providers securely",
    description:
      "Add Alpha Vantage, NewsAPI, and Hugging Face credentials once so server-side refreshes can hydrate prices, news, and sentiment without extra prompts.",
    highlights: [
      "Inline links jump directly to each provider’s key page.",
      "Keys are encrypted at rest and validated during every cron run.",
    ],
    cta: {
      label: "Add API keys",
      href: "/settings#api-keys",
    },
  },
  {
    id: "alerts",
    badge: "Notifications",
    title: "Never miss a move",
    description:
      "Enable email notifications and configure price alerts. We trigger alerts during the same cron run that updates your dashboard snapshot.",
    highlights: [
      "Daily emails summarize alert hits so your inbox stays tidy.",
      "Keep API keys valid so refreshes continue pulling high-quality data.",
    ],
    cta: {
      label: "Set price alerts",
      href: "/settings#price-alerts",
    },
  },
  {
    id: "design",
    badge: "Personalise",
    title: "Make the workspace yours",
    description:
      "Adjust accent colours, motion preferences, and feature toggles from Settings → Experience design. Preferences stick to each device.",
    highlights: [
      "Disable forecasting, market comparisons, or sentiment overlays per device.",
      "Switch between compact and full layouts to match your workflow.",
    ],
    cta: {
      label: "Open design controls",
      href: "/settings#experience",
    },
  },
];


