# FinanceApp

A Next.js dashboard that tracks stock prices and company news, scores each news article for sentiment, and sends email alerts when a price crosses a threshold. The author runs one private instance for personal use. Sign-in is limited to an email allowlist, so there is no public demo.

## What it does

- Dashboard of tracked companies with price charts, recent news and sentiment badges.
- Company pages with price history, a linear-regression price forecast, a sentiment-weighted forecast and a comparison against stored market indices.
- Watchlists, limited to 20 companies each. Companies can be added by ticker or ISIN, and ISINs are resolved to ticker symbols.
- Portfolios with up to 30 holdings. The app computes return, volatility and Sharpe ratio, and builds an efficient frontier for the holdings.
- Price alerts with an above or below threshold. An alert sends at most one email per day.
- News sentiment from Hugging Face models. Articles for ETFs are skipped.
- Per-user API keys for Alpha Vantage, NewsAPI and Hugging Face, stored AES-encrypted in the database.
- Settings toggles for forecasting, market comparisons, portfolio analytics and sentiment signals. The toggles are stored in the browser.
- Google and Apple sign-in through Better Auth, restricted by `ALLOWED_EMAILS`.
- Installable as a PWA (web manifest and service worker in `public/sw.js`).

## Stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16.4 (App Router, Turbopack), React 19.3, TypeScript 6.0 |
| Styling | Tailwind CSS 4.3, Radix UI, lucide-react, Recharts 3.10 |
| Auth | Better Auth 1.7 with Google and Apple providers |
| Database | SQLite through Prisma 7.10 and `better-sqlite3` 13 |
| Email | Nodemailer 10 over SMTP |
| Tooling | bun 1.4, ESLint 10 |

External data comes from [Alpha Vantage](https://www.alphavantage.co/) (prices), [NewsAPI](https://newsapi.org/) (articles) and the Hugging Face inference API (sentiment). The sentiment code tries `cardiffnlp/twitter-roberta-base-sentiment-latest`, then `nlptown/bert-base-multilingual-uncased-sentiment`, then `distilbert/distilbert-base-uncased-finetuned-sst-2-english`, and keeps the first one that answers.

## Run it locally

You need bun and a C++ toolchain if `better-sqlite3` has no prebuilt binary for your platform.

```bash
bun install
cp env.example .env.local   # fill in the values you need
bunx prisma migrate deploy  # creates ./data/finance.db
bun run dev
```

Open <http://localhost:3000>. Sign-in needs Google or Apple credentials and your email in `ALLOWED_EMAILS`. Apple does not accept localhost redirects, so test Apple sign-in on a public URL.

## Scripts

| Command | Effect |
| --- | --- |
| `bun run dev` | Next.js dev server with Turbopack |
| `bun run build` | `prisma generate`, then `next build --turbopack` (also type-checks) |
| `bun run start` | Creates `data/`, runs `prisma migrate deploy`, then `next start` |
| `bun run lint` | ESLint over the repository |
| `bun run lint:fix` | ESLint with `--fix` |

The repository has no test suite.

## Environment variables

`env.example` lists the variables below. Values in the first group are needed to start the app and sign in.

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | Better Auth signing secret |
| `NEXT_PUBLIC_APP_URL` | Public base URL. Required in production builds. Also read as `APP_URL`, `AUTH_URL` or `SITE_URL` |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google OAuth client |
| `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` | Apple Services ID and its client secret JWT |
| `APPLE_APP_BUNDLE_IDENTIFIER`, `APPLE_REDIRECT_URI` | Optional Apple settings |
| `ALLOWED_EMAILS` | Comma-separated allowlist. If empty, any account that signs in is kept |
| `DATABASE_URL` | SQLite file, default `file:./data/finance.db` |
| `ENCRYPTION_KEY` | Key for the stored API keys. The code falls back to a hardcoded default, so always set it |
| `CRON_SECRET` | Bearer token for `/api/cron/*`. If unset, the cron routes accept any request |
| `ALPHA_VANTAGE_API_KEY`, `NEWS_API_KEY`, `HUGGINGFACE_API_KEY` | Shared API keys for the cron refresh |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Outgoing mail for alerts |

The refresh route also reads `CRON_BATCH_SIZE` (default 1), `CRON_MAX_RUNTIME_MS` (15000), `CRON_PRICE_DELAY_MS` (12000) and `CRON_NEWS_DELAY_MS` (100). These are not in `env.example`.

`scripts/generate-apple-secret.js` signs the Apple client secret JWT. It reads a `.p8` key file from `scripts/` that you download from Apple. `.p8` files are git-ignored. Edit the key ID, team ID and client ID constants at the top of the script before running it.

## Scheduled refresh

Prices and news are not fetched on page load. An external scheduler calls the refresh route, and `lib/constants/limits.ts` assumes a 3-hour interval to stay inside the free API quotas.

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://your-domain/api/cron/refresh-data?batchSize=3"
```

The route (GET or POST) works through the tracked companies in batches and stores its position in the `RefreshJob` table. Each call returns `jobId`, `processedCompanies`, `totalCompanies` and `hasMore`. While `hasMore` is true, call again with `?jobId=<id>` to continue where the last call stopped. A call fetches prices and news, scores sentiment, upserts the rows and evaluates price alerts for the companies in its batch. A batch stops when it hits `CRON_MAX_RUNTIME_MS`.

Two related routes exist. `/api/cron/user-refresh` refreshes data using each user's own stored API keys and sends notifications. `/api/cron/status` reports the newest stored price and news timestamps. `/api/health` returns `{"status":"ok"}`.

## Deployment

The author's instance runs on a self-hosted Coolify server built with Nixpacks (`nixpacks.toml` installs the compiler toolchain for `better-sqlite3`). The container needs a persistent volume at `/app/data` so the SQLite file survives redeploys. `bun run start` applies the Prisma migrations on every boot. Set `NEXT_PUBLIC_APP_URL` as a build-time variable.

Vercel is a poor fit because SQLite needs a writable, persistent filesystem.

## Project layout

```
app/            Pages and API routes (auth, companies, news, stock-prices, user, cron, health)
components/     Dashboard, charts, settings, PWA provider, UI primitives
lib/services/   Alpha Vantage, NewsAPI and Hugging Face clients, forecasting, portfolio optimiser, alerts, email
lib/auth.ts     Better Auth configuration and the email allowlist check
prisma/         schema.prisma and the migration history
proxy.ts        Redirects unauthenticated requests to /auth/signin
scripts/        Apple secret generator, PWA icon generator, data directory setup
```

## License

The `LICENSE` file contains the standard MIT text followed by a note that access to the hosted instance is restricted. GitHub does not recognise the file as plain MIT because of that note.
