## FinanceApp Architecture Overview

This document captures the core pieces of the project so that future readers (human or LLM) can quickly understand what is implemented, how the modules interact, and why certain design choices were made.

---

### 1. High-Level Flow

1. **Authentication** – Auth.js v5 (Google OAuth) protects the application. `auth.ts` + `middleware.ts` gate routes and enrich `session.user`.
2. **Settings Landing** – `/app/settings/page.tsx` is the control centre for personalisation, API keys, watchlists, portfolios, notifications, and price alerts.
3. **Data APIs** – All user-specific settings hit routes under `/app/api/user/**`, which delegate to Prisma-backed service layers in `lib/services`.
4. **Background Refresh** – `/app/api/cron/refresh-data/route.ts` is invoked by an external scheduler. It refreshes prices + news, performs sentiment analysis, then runs price-alert checks.
5. **Notifications** – `lib/services/notifications.ts` stores notification rows and sends email via helpers in `lib/services/email.ts`. Preferences are persisted in `notification_preferences`.

---

### 2. Key Modules

| Layer | Location | Responsibilities |
|-------|----------|------------------|
| UI | `app/settings/page.tsx` | Client-side forms for API keys, watchlists, portfolios, email preferences, and price alerts. Uses shadcn `Tooltip` & `HoverCard` to explain features inline. |
| Domain Services | `lib/services/*.ts` | Encapsulate data access for watchlists, portfolios, notifications, price alerts, API keys, companies. Convert Prisma records into view models. |
| API Routes | `app/api/user/**`, `app/api/cron/**` | Authentication guard, request validation, call out to services, shape JSON responses. |
| Background Jobs | `app/api/cron/refresh-data/route.ts` | Sequential refresh loop that respects third-party rate limits. Invokes `checkPriceAlertsForCompany` after each price update. |
| Database | `prisma/schema.prisma` | Prisma schema defines users, watchlists, notification preferences, and `price_alerts` unique on `(userId, companyId, direction, threshold)`. |

---

### 3. Settings Page Features

The settings page is intentionally stateful: each section keeps local form state, optimistic UI, and error handling. Key components:

- **Design Controls** – Provided by `components/design-controls.tsx`; `DesignControlsTrigger` is used in header and settings.
- **API Keys** – UI reads `/api/user/api-keys`, writes to `POST /api/user/api-keys`. Hitting “Save key” sets + validates key through `lib/services/user-api-keys.ts`.
- **Watchlists** – Lists returned by `/api/user/watchlists`. Symbols can be appended with inline forms (`/api/user/watchlists/[watchlistId]/companies`); new endpoint creates companies if they don’t exist (including ETF support) and deduplicates entries.
- **Portfolios** – Currently CRUD skeletons only (optimiser hooks exist in service layer).
- **Email Preferences** – Checkbox toggles `PUT /api/user/notifications/preferences`; fallback default is enabled.
- **Price Alerts** – Client hits `GET/POST /api/user/price-alerts` and `DELETE /api/user/price-alerts/[alertId]`. Alerts persist in DB and display trigger history when `lastTriggered` is set.
- **Inline help** – Small tooltips for quick hints and `HoverCard` for longer explanations (watchlists, portfolios, email, price alerts).

---

### 4. Backend Detail

#### 4.1 Notification Preferences
- Schema: `NotificationPreference { userId, emailEnabled }`.
- Default: created automatically on first read (`getNotificationPreference`).
- API: `/api/user/notifications/preferences` returns and updates the flag.
- Consumption: Email senders (`notifySentimentChanged`, `notifyBreakingNews`, `notifyPriceAlert`) respect the stored flag before sending mail.

#### 4.2 Price Alerts
- Schema: `PriceAlert { userId, companyId, direction, threshold, isActive, lastTriggered }`.
- Creation pipeline:
  1. Client submits symbol + threshold via settings.
  2. API validates numeric input, finds or creates a `Company` (optionally hitting Alpha Vantage / Yahoo fallback + name resolution).
  3. `createPriceAlert` enforces uniqueness per `(user, company, direction, threshold)` and returns existing record if duplication is attempted.
- Evaluation pipeline:
  1. Cron job fetches latest prices per company.
  2. `checkPriceAlertsForCompany(companyId, currentPrice)` collects active alerts, checks direction, respects “once per day” guard using `lastTriggered`, verifies email preference, then calls `notifyPriceAlert`.
  3. Successful send updates `lastTriggered`.

#### 4.3 Watchlist Symbol Handling
- Symbols added via `/api/user/watchlists/[watchlistId]/companies`:
  - Creates company stub if needed, with optional ETF metadata.
  - Handles duplicates gracefully (returns `alreadyExists: true` to the client).
  - Returns refreshed watchlist record for UI syncing.

#### 4.4 Cron Refresh
- Sequence:
  1. Authorises with optional `CRON_SECRET`.
  2. Iterates companies, pulling financial data from Alpha Vantage first, falling back to Yahoo Finance.
  3. Upserts `stockPrice` entries.
  4. Executes `checkPriceAlertsForCompany`.
  5. Sleeps between calls to respect third-party rate limits.
  6. Fetches news articles via NewsAPI, pushes through `SentimentAPI` (Hugging Face), and upserts into `news`.
  7. Logs summary statistics and duration.

---

### 5. Data Model Cheatsheet

Relevant Prisma models added or augmented for settings features:

- `NotificationPreference` – one-to-one with `User`, toggles email sends.
- `PriceAlert` – belongs to `User` & `Company`, unique combination ensures no duplicates.
- `Watchlist` & `WatchlistCompany` – standard relation; company lookups include basic metadata (name, symbol, industry).

Refer to `prisma/schema.prisma` lines ~270 onwards for the exact definitions.

---

### 6. Environment Variables

Important `.env` keys that interact with these features:

| Variable | Purpose |
|----------|---------|
| `ALPHA_VANTAGE_API_KEY` | Primary financial data source for both UI fetches & cron job |
| `NEWS_API_KEY` | News aggregation |
| `HUGGINGFACE_API_KEY` | Sentiment analysis + API key validation |
| `CRON_SECRET` | Optional bearer token guard for `/api/cron/refresh-data` |
| SMTP variables (`SMTP_HOST`, etc.) | Required for `lib/services/email.ts` to send notification mails |

Ensure SMTP details are set; otherwise email functions will log failures.

---

### 7. Operational Tips

- **Migrations**: Run `npx prisma migrate dev` whenever schema changes (notification preferences, price alerts) are pulled.
- **Seed**: `npm run db:seed` initializes the database without companies; users add symbols manually.
- **Cron Scheduling**: Deployers must configure an external scheduler (e.g., GitHub Actions, Vercel Cron, cron service) to call `/api/cron/refresh-data`.
- **LLM Context**: This document plus `README.md` give high-level overview; service files detail business logic for deeper inspection.

---

### 8. Recent Enhancements (Oct 2025)

- Settings UI supports inline symbol management for watchlists, ETF detection, and price alert creation.
- Email notification preferences persisted per user.
- Cron refresh now triggers price alerts immediately after price imports.
- Tooltips & hover cards document features directly in the UI for users (and provide hints for future LLM analyses).

---

Use this as the starting point before diving into individual files to understand specific implementations.
