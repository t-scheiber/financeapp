# FinanceApp – Financial Data & News Dashboard

FinanceApp is a modern Next.js application that combines real-time market data, curated news, sentiment insights, and portfolio tooling into a single experience. The hosted instance is private, but the source code is MIT licensed – feel free to clone and adapt it.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **Auth.js v5 (Google SSO)** protects the app while keeping the stack future-proof.
- **Editable watchlists** let you create lists, rename them inline, and remove individual symbols while highlighting ETFs.
- **Portfolio modelling** supports full holdings CRUD, weight updates, deletions, and a one-click equal-weight optimiser that refreshes analytics.
- **On-demand dividends** fetch the latest payout history from Alpha Vantage directly from the company view whenever you need it.
- **Feature toggles** allow each device to decide whether predictive forecasting, market comparisons, portfolio analytics, and sentiment overlays appear.
- **Encrypted API keys** unlock Alpha Vantage, NewsAPI, and Hugging Face integrations directly from settings.
- **Email notifications** respect per-user preferences stored in `notification_preferences`.
- **Price alerts** fire during the scheduled cron refresh and deliver emails once per day per threshold.
- **Hover cards & tooltips** explain each settings feature inline for first-time users (and LLM readers).
- **Automated refresh** (recommended every 4 hours) updates prices, pulls news, runs sentiment, and checks alerts.
- **Next.js App Router + Turbopack + TypeScript** deliver modern DX and fast builds.
- **Biome** enforces formatting/linting; Prisma models back all persistent state.

## Financial Features & Usage Guide

FinanceApp keeps every market workflow behind authenticated screens. Each section below explains what a feature does and how to operate it in practice.

### Dashboard overview

- **What it does**: Shows total companies tracked, price points ingested, news signals, and dividend coverage. Company cards highlight intraday movement, latest close, and coverage counts.
- **How to use it**: Sign in and land on /. Use the search bar to filter by company name, ticker symbol, industry keywords, or ISIN. Tap any card to open the detailed company view.

### Company deep dive

- **What it does**: Presents historical price charts, optional five-day forecasts, market comparisons, and sentiment summaries. Supports on-demand dividend retrieval and curated news with sentiment badges.
- **How to use it**: Click a company card from the dashboard or watchlist. Use the design controls to toggle forecasting or market comparison modules. Press "Load dividends" to fetch the latest payout history when needed.

### Watchlists

- **What it does**: Organises tickers (including ETFs) into named lists with inline editing and ETF badges.
- **How to use it**: Navigate to /settings, open the Watchlists panel, and create or rename a list. Add instruments by entering a ticker or ISIN; the backend normalises case and resolves new companies automatically.

### Portfolio analytics

- **What it does**: Stores holdings, calculates weightings, and offers an equal-weight optimiser that refreshes derived stats.
- **How to use it**: In /settings, open the Portfolios section. Select a portfolio, add tickers with desired weights, then trigger the optimiser to rebalance or refresh analytics.

### Price alerts

- **What it does**: Watches price thresholds (above or below) and emits a single email per breach each day.
- **How to use it**: In settings, scroll to Price Alerts, supply the ticker or ISIN, choose direction and threshold, then save. Keep the cron task active (see below) so alerts evaluate during scheduled refreshes.

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
- **How to use it**: Deploy a cron trigger that POSTs to /api/cron/refresh-data with CRON_SECRET in the header. The docs/ folder includes examples for common schedulers.

### ISIN-aware search

- **What it does**: Lets every search input (dashboard, watchlists, price alerts) resolve instruments by ISIN in addition to ticker symbols.
- **How to use it**: Enter the 12-character ISIN in any search field. FinanceApp strips formatting, resolves or creates the company record, and renders it just like a standard ticker.
---

## 🧰 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Auth**: Auth.js v5 (Google OAuth)
- **Database**: MySQL + Prisma ORM
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Language**: TypeScript
- **APIs**: Alpha Vantage, NewsAPI, Hugging Face
- **Tooling**: Biome, Turbopack, Prisma Studio

---

## ✅ Prerequisites

- Node.js 20+
- MySQL instance
- Google OAuth credentials
- Alpha Vantage API key
- NewsAPI key
- Hugging Face API token
- SMTP credentials for email delivery

---

## ⚙️ Installation & Setup

1. **Clone and install**

   ```bash
   git clone <your-repo-url>
   cd financeapp
   npm install
   ```

2. **Environment variables**

   ```env
   # Authentication
   AUTH_GOOGLE_ID=your-google-client-id
   AUTH_GOOGLE_SECRET=your-google-client-secret
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

   # Next.js
   NEXTAUTH_URL=http://localhost:3000
   ```

3. **Database migrations**

   ```bash
   npx prisma generate     # build Prisma client
   npx prisma migrate dev  # apply migrations
   npm run db:seed         # optional: initialise schema (no tickers seeded)
   ```

4. **Run locally**

   ```bash
   npm run dev
   ```

   Visit http://localhost:3000 and sign in with an allowed email.

---

## 📊 Settings & Data Management

- **Watchlists** - Create lists, rename them inline, remove symbols on the fly, and we still auto-badge ETFs for clarity.
- **Portfolios** - Manage holdings with ticker lookup, adjust weights, delete entries, and run the equal-weight optimiser to refresh analytics.
- **Feature controls** - Decide whether predictive forecasting, market comparisons, portfolio analytics, and sentiment overlays appear; preferences are stored per device.
- **API Keys** – Save encrypted credentials for Alpha Vantage, NewsAPI, and Hugging Face with validation feedback.
- **Email Notifications** – Toggle alerts on/off; settings persist in `notification_preferences`.
- **Price Alerts** – Configure thresholds and direction. Alerts queue during cron refresh and email once per day per trigger.
- **Inline Help** – Tooltips handle quick hints (watchlists/portfolios) while hover cards give richer explanations (email notifications, price alerts).

---

## 🔐 Authentication Notes

1. **Google OAuth** – Configure in Google Cloud console and set redirect URI to `http://localhost:3000/api/auth/callback/google` (or your production domain).
2. **Email allowlist** – Production deployments should set `ALLOWED_EMAILS` to restrict access to specific addresses.
3. **Public pages** – `/privacy-policy` and `/terms-of-service` remain accessible without authentication.

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

Schedule every 4 hours (Hostinger, Vercel Cron, GitHub Action, etc.) to hit the refresh endpoint:

```bash
curl --silent --show-error \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://your-domain.com/api/cron/refresh-data
```

The handler refreshes prices, ingests news, runs sentiment, and evaluates stored price alerts in one pass.

---

## 🧠 Architecture Overview

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a detailed walkthrough of modules, service boundaries, and background jobs. Highlights:

- `app/settings/page.tsx` orchestrates client-side forms and fetches.
- `/app/api/user/**` endpoints guard input and call Prisma-backed services in `lib/services`.
- `prisma/schema.prisma` models notification preferences & price alerts alongside watchlists/portfolios.
- `app/api/cron/refresh-data/route.ts` pulls third-party data and dispatches alerts.

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
```

---

## 🚀 Deployment

### Vercel (recommended)
1. Push the repository to GitHub.
2. Connect the repo in Vercel and copy environment variables.
3. Add a cron integration (or external scheduler) to call `/api/cron/refresh-data`.

### Manual
```bash
npm run build
npm start
```
Ensure environment variables are set and the cron job is configured separately.

---

## 🛠 Development Commands

```bash
# Dev server
npm run dev

# Production build
npm run build
npm run start

# Database helpers
npx prisma studio
npx prisma migrate dev
npm run db:seed

# Lint / format
npm run lint
npm run format
```

---

## 🗂 Project Structure

```
financeapp/
├── app/                      # Next.js App Router (pages + API routes)
├── components/               # Reusable components (shadcn/ui + custom)
├── docs/                     # Architecture and supporting docs
├── lib/                      # Domain services, utils, auth helpers
├── prisma/                   # Prisma schema & migrations
├── public/                   # Static assets
├── .env.example              # Environment template
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
- [Auth.js](https://authjs.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://prisma.io/)
- [Alpha Vantage](https://www.alphavantage.co/)
- [NewsAPI](https://newsapi.org/)
- [Hugging Face](https://huggingface.co/)

