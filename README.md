# FinanceApp – Financial Data & News Dashboard

FinanceApp is a modern Next.js application that combines real-time market data, curated news, sentiment insights, and portfolio tooling into a single experience. The hosted instance is private, but the source code is MIT licensed – feel free to clone and adapt it.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **Adaptive Better Auth (Google & Apple OAuth)** handles secure sign-in with email allowlists and SameSite-aware cookies.
- **Server-rendered dashboard snapshots** hydrate from a single `/api/company-overview` response and expose an on-demand refresh action without waterfalling N fetches.
- **Editable watchlists** let you create lists, rename them inline, and remove individual symbols while highlighting ETFs.
- **Portfolio modelling** supports full holdings CRUD, weight updates, deletions, and a one-click equal-weight optimiser that refreshes analytics.
- **On-demand dividends & news** fetch the latest Alpha Vantage payout history and trigger `/api/news/refresh` to re-run curated sentiment analysis per company.
- **Feature toggles + design controls** allow each device to decide whether predictive forecasting, market comparisons, portfolio analytics, and sentiment overlays appear.
- **Encrypted API keys** unlock Alpha Vantage, NewsAPI, and Hugging Face integrations directly from settings with validation feedback.
- **Email notifications** respect per-user preferences stored in `notification_preferences`.
- **Price alerts** fire during the resumable cron refresh and deliver emails once per day per threshold.
- **Hover cards & tooltips** explain each settings feature inline for first-time users (and LLM readers).
- **Installable PWA** ships a manifest, Apple/Safari meta tags, and offline service worker so your dashboard behaves like a native app on iOS, Android, and desktop.
- **Automated refresh** (recommended every 3 hours) uses a resumable job backed by the `RefreshJob` table to update prices, pull news, run sentiment, and check alerts.
- **Next.js App Router + Turbopack + TypeScript** deliver modern DX and fast builds.
- **ESLint** enforces code quality and formatting; Prisma models back all persistent state.

## Financial Features & Usage Guide

FinanceApp keeps every market workflow behind authenticated screens. Each section below explains what a feature does and how to operate it in practice.

### Dashboard overview

- **What it does**: Shows total companies tracked, price points ingested, news signals, and dividend coverage. Company cards highlight intraday movement, latest close, and coverage counts — all rendered server-side for instant loads.
- **How to use it**: Sign in and land on /. Use the search bar to filter by company name, ticker symbol, industry keywords, or ISIN. Tap any card to open the detailed company view or press “Refresh data” to pull a fresh snapshot without reloading the entire page.

### Company deep dive

- **What it does**: Presents historical price charts, optional five-day forecasts, market comparisons, and sentiment summaries. Supports on-demand dividend retrieval and curated news with sentiment badges.
- **How to use it**: Click a company card from the dashboard or watchlist. Use the design controls to toggle forecasting or market comparison modules. Press “Load dividends” to fetch the latest payout history or “Refresh news” to invoke the new `/api/news/refresh` endpoint for regenerated sentiment.

### Watchlists

- **What it does**: Organises tickers (including ETFs) into named lists with inline editing and ETF badges.
- **How to use it**: Navigate to /settings, open the Watchlists panel, and create or rename a list. Add instruments by entering a ticker or ISIN; the backend normalises case and resolves new companies automatically. You can track up to 20 symbols per user so the three-hour cron can stay within free-tier API quotas.

### Portfolio analytics

- **What it does**: Stores holdings, calculates weightings, and offers an equal-weight optimiser that refreshes derived stats.
- **How to use it**: In /settings, open the Portfolios section. Select a portfolio, add tickers with desired weights (up to 30 holdings per portfolio), then trigger the optimiser to rebalance or refresh analytics.

### Price alerts

- **What it does**: Watches price thresholds (above or below) and emits a single email per breach each day.
- **How to use it**: In settings, scroll to Price Alerts, supply the ticker or ISIN, choose direction and threshold, then save. Keep the every-three-hour cron task active (see below) so alerts evaluate during scheduled refreshes.

### Email notifications

- **What it does**: Manages opt-in preferences for market intelligence, sentiment changes, and price alerts.
- **How to use it**: Visit the Notifications panel in settings. Toggle the switches to decide which alert types send emails; preferences persist per user.

### API key vault

- **What it does**: Encrypts Alpha Vantage, NewsAPI, and Hugging Face credentials so the app can enrich market data, sentiment, and forecasts.
- **How to use it**: In settings, expand the API Keys section. Paste provider keys, save, and the app validates reachability before encrypting values at rest.

### Feature toggles

- **What it does**: Controls optional analytics (forecasting, market comparisons, sentiment overlays, portfolio metrics) per device without affecting other sessions.
- **How to use it**: Use the palette icon in the header or the Feature Controls card in settings. Enable or disable individual modules; dashboard and company views update instantly.

### Automated data refresh

- **What it does**: A scheduled job ingests new prices, news, sentiment, and executes price alerts so the dashboard stays current.
- **How to use it**: Deploy a cron trigger that POSTs to `/api/cron/refresh-data` with `CRON_SECRET` in the header. Run it every **3 hours** (e.g. `0 */3 * * * curl …`) so you stay inside the Alpha Vantage / NewsAPI free-tier budgets while keeping snapshots fresh.

### ISIN-aware search

- **What it does**: Lets every search input (dashboard, watchlists, price alerts) resolve instruments by ISIN in addition to ticker symbols.
- **How to use it**: Enter the 12-character ISIN in any search field. FinanceApp strips formatting, resolves or creates the company record, and renders it just like a standard ticker.

---

## 🧰 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Auth**: Better Auth (Google & Apple OAuth)
- **Database**: MySQL + Prisma ORM
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Language**: TypeScript
- **APIs**: Alpha Vantage, NewsAPI, Hugging Face
- **Tooling**: ESLint, Turbopack, Prisma Studio

---

## ✅ Prerequisites

- **Bun 1.3.1+** (package manager and runtime)
- MySQL instance
- Google OAuth or Apple OAuth credentials
- Alpha Vantage API key (optional, for financial data)
- NewsAPI key (optional, for news articles)
- Hugging Face API token (optional, for sentiment analysis)
- SMTP credentials (optional, for email notifications)

---

## ⚙️ Installation & Setup

1. **Clone and install**

   ```bash
   git clone <your-repo-url>
   cd financeapp
   bun install
   ```

2. **Environment variables**

   ```env
   # Authentication (Better Auth)
   AUTH_GOOGLE_ID=your-google-client-id
   AUTH_GOOGLE_SECRET=your-google-client-secret
   APPLE_CLIENT_ID=your-apple-service-id
   APPLE_CLIENT_SECRET=your-apple-client-secret-jwt
   APPLE_APP_BUNDLE_IDENTIFIER=com.yourcompany.yourapp  # Optional, for native iOS
   AUTH_SECRET=your-auth-secret

   # Email allowlist (production recommended)
   ALLOWED_EMAILS=user@example.com,admin@company.org

   # Database
   DATABASE_URL=mysql://user:password@localhost:3306/financeapp

   # APIs
   ALPHA_VANTAGE_API_KEY=your-alpha-vantage-api-key
   NEWS_API_KEY=your-newsapi-key
   HUGGINGFACE_API_KEY=your-huggingface-api-key

   # Cron job security
   CRON_SECRET=your-super-secret-random-string

   # SMTP (for notifications & alerts)
   SMTP_HOST=smtp.yourprovider.com
   SMTP_PORT=587
   SMTP_USER=your-smtp-user
   SMTP_PASS=your-smtp-password
   SMTP_SECURE=false
   SMTP_FROM="FinanceApp <alerts@yourdomain.com>"

   # Application URL
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

3. **Database migrations**

   ```bash
   bunx prisma generate     # build Prisma client
   bunx prisma migrate dev  # apply migrations
   ```

4. **Run locally**

   ```bash
   bun run dev
   ```

   Visit <http://localhost:3000> and sign in with an allowed email.

5. **(Optional) Test the PWA**

   - The app now exposes `/manifest.webmanifest` and registers `/sw.js`.
   - On iOS Safari: open the site, tap the share icon, then “Add to Home Screen”.
   - On Android Chrome/Edge: tap the menu → “Install app”.
   - On desktop Chrome/Edge: look for the “Install” icon in the URL bar.

---

## 📊 Settings & Data Management

- **Watchlists** - Create lists, rename them inline, remove symbols on the fly, and we still auto-badge ETFs for clarity.
- **Portfolios** - Manage holdings with ticker lookup, adjust weights, delete entries, and run the equal-weight optimiser to refresh analytics.
- **Feature controls** - Decide whether predictive forecasting, market comparisons, portfolio analytics, and sentiment overlays appear; preferences are stored per device.
- **API Keys** – Save encrypted credentials for Alpha Vantage, NewsAPI, and Hugging Face with validation feedback.
- **Email Notifications** – Toggle alerts on/off; settings persist in `notification_preferences`.
- **Price Alerts** – Configure thresholds and direction. Alerts queue during cron refresh and email once per day per trigger.
- **Inline Help** – Tooltips handle quick hints (watchlists/portfolios) while hover cards give richer explanations (email notifications, price alerts).
- **Server-hydrated layout** – `/app/settings/page.tsx` preloads watchlists, portfolios, API keys, and alerts on the server, then streams into a responsive client surface that now adapts cleanly to phones and tablets.

---

## 🔐 Authentication Notes

1. **Google OAuth** – Configure in Google Cloud console and set redirect URI to `http://localhost:3000/api/auth/callback/google` (or your production domain). Better Auth handles the OAuth flow automatically.
2. **Apple OAuth** – Configure in Apple Developer Portal:
   - Create an App ID with "Sign In with Apple" capability
   - Create a Service ID (this will be your `APPLE_CLIENT_ID`)
   - Create a Key with "Sign In with Apple" enabled and download the `.p8` file
   - Generate a JWT client secret using the Key ID, Team ID, and `.p8` file (this will be your `APPLE_CLIENT_SECRET`)
   - Set redirect URI to `https://yourdomain.com/api/auth/callback/apple`
   - See [Better Auth Apple documentation](https://better-auth.com/docs/guides/social-providers/apple) for detailed setup
3. **Email allowlist** – Production deployments should set `ALLOWED_EMAILS` to restrict access to specific addresses. The app automatically validates emails after OAuth sign-in and blocks unauthorized users.
4. **Public pages** – `/privacy-policy` and `/terms-of-service` remain accessible without authentication.
5. **Session management** – Better Auth manages sessions with 30-day expiration and automatic refresh.

---

## 🌐 External APIs

### Financial Data – Alpha Vantage

- Free tier (5 calls/min, 500/day) is sufficient for the cron cadence.
- Fallback to Yahoo Finance is used when Alpha Vantage is unavailable.

### News – NewsAPI

- Fetches English articles per company to populate dashboards & watchlists.

### Sentiment Analysis – Hugging Face

- Uses `distilbert-base-uncased-finetuned-sst-2-english` for cost-effective polarity checks.
- Also powers H/F API key validation by calling a test inference.

---

## ⏱ Cron Job

The global refresh pipeline is now resumable:

1. **Kick off (or continue) a job**

   ```bash
   curl --silent --show-error \
     -H "Authorization: Bearer $CRON_SECRET" \
     "https://your-domain.com/api/cron/refresh-data?batchSize=3"
   ```

   The response includes `jobId`, `hasMore`, counts, and timestamps.

2. **Loop until finished** – While `hasMore` is `true`, call the same endpoint with the returned `jobId` (and optional `batchSize`) to process the next slice:

   ```bash
   curl --silent --show-error \
     -H "Authorization: Bearer $CRON_SECRET" \
     "https://your-domain.com/api/cron/refresh-data?jobId=<returned-id>&batchSize=3"
   ```

3. **Inspect progress** – The `refresh_jobs` table tracks totals, last processed company, and recent errors, so observability dashboards can display status without hitting the API.

4. **Schedule every 3 hours** – On Ubuntu, for example:

   ```bash
   0 */3 * * * curl --silent --show-error -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/refresh-data
   ```

   This cadence maximises coverage without exceeding the free-tier limits for Alpha Vantage, NewsAPI, or Hugging Face.

This design obeys Alpha Vantage / Hugging Face rate limits, survives cold starts, and lets different schedulers (Vercel Cron, GitHub Actions, fly.io Machines, etc.) share the same job cursor.

---

## 🧠 Architecture Overview

Key architectural highlights:

- `app/page.tsx` renders the dashboard as an RSC, sourcing data via `lib/services/dashboard` and hydrating the client card grid with a single payload.
- `app/settings/page.tsx` performs all data fetching on the server and streams into `components/settings/settings-client.tsx`, which owns the interactive forms.
- `/app/api/company-overview/route.ts` exposes the aggregated dashboard snapshot used by both the initial load and the “Refresh data” action.
- `/app/api/news/refresh/route.ts` performs on-demand NewsAPI/Hugging Face ingestion, decoupling expensive sentiment runs from simple GET requests.
- `app/api/cron/refresh-data/route.ts` coordinates resumable jobs persisted in the `RefreshJob` table so schedulers can pause/resume safely.
- `/app/api/user/**` endpoints guard input and call Prisma-backed services in `lib/services`.
- `prisma/schema.prisma` models notification preferences, refresh jobs & price alerts alongside watchlists/portfolios.
- `lib/auth.ts` configures Better Auth with email allowlist validation hooks.
- `proxy.ts` handles route protection and authentication middleware.

### Key Prisma models

```prisma
model NotificationPreference {
  id           String   @id @default(cuid())
  userId       String   @unique
  emailEnabled Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model PriceAlert {
  id            String   @id @default(cuid())
  userId        String
  companyId     Int
  direction     String   // "above" or "below"
  threshold     Float
  isActive      Boolean  @default(true)
  lastTriggered DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([userId, companyId, direction, threshold])
}

model RefreshJob {
  id                 String   @id @default(cuid())
  status             RefreshJobStatus @default(PENDING)
  totalCompanies     Int
  processedCompanies Int      @default(0)
  batchSize          Int      @default(5)
  lastCompanyId      Int?
  errorCount         Int      @default(0)
  errors             Json?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

---

## 🚀 Deployment

### Vercel (recommended)

1. Push the repository to GitHub.
2. Connect the repo in Vercel and copy environment variables.
3. Add a cron integration (or external scheduler) to call `/api/cron/refresh-data`.

### Manual

```bash
bun run build
bun run start
```

Ensure environment variables are set and the cron job is configured separately.

---

## 🛠 Development Commands

```bash
# Install dependencies
bun install

# Development server (with Turbopack)
bun run dev

# Production build
bun run build
bun run start

# Database helpers
bunx prisma studio          # Open Prisma Studio
bunx prisma migrate dev      # Create and apply migrations
bunx prisma generate         # Generate Prisma client
bun run db:seed             # Seed database (optional)

# Code quality
bun run lint                # Run ESLint
bun run lint:fix            # Fix linting issues
bun run format              # Format code with ESLint
```

---

## 🗂 Project Structure

```text
financeapp/
├── app/                      # Next.js App Router (pages + API routes)
│   ├── api/                  # API routes (auth, user, cron, etc.)
│   ├── auth/                 # Authentication pages (signin, error)
│   └── settings/             # Settings page
├── components/               # Reusable components (shadcn/ui + custom)
├── lib/                      # Domain services, utils, auth helpers
│   ├── auth.ts              # Better Auth configuration
│   ├── auth-client.ts       # Client-side auth utilities
│   ├── auth-server.ts       # Server-side auth utilities
│   └── services/            # Business logic services
├── prisma/                   # Prisma schema & migrations
├── proxy.ts                  # Next.js middleware for route protection
└── README.md                 # This file
```

---

## 🔐 Security & Best Practices

- All secrets live in environment variables; never commit `.env`.
- Auth middleware protects every non-public route.
- Prisma uses parameterized queries, reducing SQL injection risk.
- Input validation is performed server-side for all API routes.
- Sensitive values (API keys) are AES-encrypted before hitting the database.

---

## 🤝 Contributing

1. Fork the repo.
2. Create a branch: `git checkout -b feature/amazing-feature`.
3. Commit your work: `git commit -m "Add amazing feature"`.
4. Push: `git push origin feature/amazing-feature`.
5. Open a pull request.

---

## 📜 License

MIT © [Thomas Scheiber](LICENSE). You can reuse the code, but the deployed instance at `finance.thomasscheiber.com` remains private.

---

## 🙌 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Better Auth](https://better-auth.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://prisma.io/)
- [Alpha Vantage](https://www.alphavantage.co/)
- [NewsAPI](https://newsapi.org/)
- [Hugging Face](https://huggingface.co/)
