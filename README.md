# FinanceApp

A Next.js dashboard that tracks stock prices and company news, scores each news article for sentiment, and sends email alerts when a price crosses a threshold. I run one private instance for my own use. Sign-in is limited to an email allowlist. A read-only demo account with sample data is open to everyone, see [Demo](#demo).

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
- A shared, read-only demo account that needs no sign-in, backed by its own SQLite file.
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

## Demo

Open <https://finance.thomasscheiber.com/auth/signin> and choose **Try the demo**, or go to <https://finance.thomasscheiber.com/auth/signin?demo=1> to start it directly. No account or OAuth sign-in is involved.

The button calls `POST /api/auth/demo/sign-in`, an endpoint added by a small Better Auth plugin in `lib/demo/auth-plugin.ts`. It creates a one-day session for a fixed user, `demo@demo.invalid` (`.invalid` never resolves, so no mail can reach it), and sets the normal Better Auth session cookie.

What the demo account sees:

- Five companies (AAPL, MSFT, NVDA, AMZN, KO) with 120 trading days of prices, dividends, two news items each with a sentiment label, and two market indices.
- Two watchlists, a portfolio of all five companies, and two price alerts.
- The dashboard, company pages with charts, forecasts and market comparison, and the settings page with the portfolio statistics.

The data comes from `lib/demo/fixture.json`. Company names, tickers and ISINs are real public identifiers. The prices and index values come from a seeded random walk and are not real quotes, and the news items are made up. The seeding code shifts the dates so that the newest price is today.

How the demo is kept apart from real data:

- Demo data lives in a second SQLite file, `DEMO_DATABASE_URL` (default `file:./data/demo.db`). `lib/db.ts` exports a `prisma` client that looks up the session cookie on each query and sends the query to the demo file when the session belongs to the demo user. Better Auth itself always uses the real database, so the demo user's sessions are stored there.
- `proxy.ts` answers every write request (any method other than GET, HEAD or OPTIONS) from a demo session with HTTP 403 and the message "The demo is read-only". The exceptions are sign-out, starting a new demo session and building the efficient frontier, which only writes its result to the demo file. Demo sessions also get 403 on `/api/cron/*`.
- The two read routes that can call Alpha Vantage, `/api/stock-prices?symbol=` and `/api/companies/<id>/dividends`, return stored data for demo sessions instead. The email sender skips the demo address. The demo account cannot store API keys, because that is a write.
- The demo file is rebuilt from the fixture in one transaction on the first demo sign-in after a start and then at most every 6 hours.

## Run it locally

You need bun and a C++ toolchain if `better-sqlite3` has no prebuilt binary for your platform.

```bash
bun install
cp env.example .env.local   # fill in the values you need
bun run db:migrate          # creates ./data/finance.db and ./data/demo.db
bun run dev
```

Open <http://localhost:3000>. Sign-in needs Google or Apple credentials and your email in `ALLOWED_EMAILS`. Apple does not accept localhost redirects, so test Apple sign-in on a public URL. **Try the demo** works without any credentials once both databases exist.

## Scripts

| Command | Effect |
| --- | --- |
| `bun run dev` | Next.js dev server with Turbopack |
| `bun run build` | `prisma generate`, then `next build --turbopack` (also type-checks) |
| `bun run start` | Creates `data/`, runs `prisma migrate deploy` on the real and the demo database, then `next start` |
| `bun run db:migrate` | Runs `prisma migrate deploy` on the real and the demo database |
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
| `DEMO_DATABASE_URL` | SQLite file for the demo account, default `file:./data/demo.db`. Not in `env.example` |
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

The author's instance runs on a self-hosted Coolify server, built from the `Dockerfile` in this repository. It replaces the earlier Nixpacks build. The Nixpacks image shipped Bun 1.3.0, which cannot read `bun.lock`, and it had no compiler for `better-sqlite3`.

### Image

The `Dockerfile` has four stages. `toolchain` installs Bun 1.4.0 (the version in `packageManager`, checked with `bun --version`) and `python3`, `make` and `g++` on `node:22.23.5-bookworm-slim`. `prod-deps` and `build` run `bun install --frozen-lockfile`, and `build` then runs `bun run build`. The `runtime` stage starts from the same Node.js image without the compiler or Bun, runs as the `node` user and copies in `.next`, the production `node_modules`, `prisma/` and the generated Prisma client. Its start command does what `bun run start` does: create the data directory, run `prisma migrate deploy` on the real database and then on the demo database (`scripts/migrate-demo-db.mjs`), start `next start`. Nothing in `bun run start` needs Bun at run time, so the image calls `node_modules/.bin/prisma` and `node_modules/.bin/next` directly.

```bash
docker build --build-arg NEXT_PUBLIC_APP_URL=https://finance.example.com -t financeapp .
docker run -d --name financeapp -p 3000:3000   -v financeapp-data:/app/data   -e NEXT_PUBLIC_APP_URL=https://finance.example.com   -e AUTH_SECRET=... -e ALLOWED_EMAILS=you@example.com   -e AUTH_GOOGLE_ID=... -e AUTH_GOOGLE_SECRET=...   -e ENCRYPTION_KEY=... -e CRON_SECRET=...   financeapp
```

The container listens on port 3000. Its health check requests `/auth/signin`, a static page that needs no session. `/api/health` is not used because the proxy redirects anonymous requests to the sign-in page. The image has no `curl`, so leave Coolify's own health check switched off. The `HEALTHCHECK` in the Dockerfile covers it.

### Build arguments

| Argument | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Required. Public base URL. Next.js inlines it into the client JavaScript, so changing it needs a rebuild. It is the only `NEXT_PUBLIC_*` variable in the code |

The build needs no other value. `AUTH_SECRET`, the OAuth credentials and the API keys are not read during `next build`, so none of them is a build argument and none ends up in an image layer. The argument exists only in the build stage. The runtime image does not contain `NEXT_PUBLIC_APP_URL`, so set it again as a run-time variable.

### Run-time variables

Set these on the container, not at build time.

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Required. The server throws at start if no public URL is set |
| `AUTH_SECRET` | Required. Better Auth signing secret |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google OAuth client |
| `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`, `APPLE_APP_BUNDLE_IDENTIFIER`, `APPLE_REDIRECT_URI` | Apple sign-in, optional |
| `ALLOWED_EMAILS` | Email allowlist |
| `ENCRYPTION_KEY`, `CRON_SECRET` | Set both |
| `ALPHA_VANTAGE_API_KEY`, `NEWS_API_KEY`, `HUGGINGFACE_API_KEY` | Shared API keys for the cron refresh |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Alert emails |
| `DATABASE_URL` | The image sets `file:/app/data/finance.db`. Leave it alone unless you move the volume |
| `DEMO_DATABASE_URL` | The image sets `file:/app/data/demo.db`, on the same volume |

The image also sets `NODE_ENV=production`, `PORT=3000` and `HOSTNAME=0.0.0.0`.

### Data volume

The app opens the SQLite file named by `DATABASE_URL`. The code default, `file:./data/finance.db`, is relative to the working directory. The working directory in the image is `/app`, so the database is `/app/data/finance.db` and the directory `/app/data` is declared as a volume, owned by the `node` user (uid 1000).

Mount a persistent volume on `/app/data`. Without one, the database lives in the container's writable layer and is deleted on every redeploy. When you copy an existing `finance.db` into a new volume, make it readable and writable for uid 1000 (`chown 1000:1000`). SQLite also needs write access to the directory itself, because it creates journal files next to the database.

The demo database is `/app/data/demo.db` on the same volume. It holds only fixture data, and the app rebuilds it, so it needs no backup.

On each start the container runs `prisma migrate deploy` for both files. On a database that is up to date it logs `No pending migrations to apply.`

### CI

`.github/workflows/docker-build.yml` builds the image on every pull request and on pushes to `main`, using dummy values only. It starts a container on a named volume, waits for the health check, requests `/auth/signin`, writes a marker row into the database, stops the container, starts a second one on the same volume and checks that the marker survived and that no migration was pending.

Vercel is a poor fit because SQLite needs a writable, persistent filesystem.

## Project layout

```
app/            Pages and API routes (auth, companies, news, stock-prices, user, cron, health)
components/     Dashboard, charts, settings, PWA provider, UI primitives
lib/services/   Alpha Vantage, NewsAPI and Hugging Face clients, forecasting, portfolio optimiser, alerts, email
lib/auth.ts     Better Auth configuration and the email allowlist check
lib/db.ts       Prisma clients for the real and the demo database
lib/demo/       Demo sign-in plugin, fixture and seeding code
prisma/         schema.prisma and the migration history
proxy.ts        Redirects unauthenticated requests to /auth/signin and blocks writes from the demo account
scripts/        Apple secret generator, PWA icon generator, data directory setup, demo database migration
Dockerfile      Production image (see Deployment)
```

## License

The `LICENSE` file contains the standard MIT text followed by a note that access to the hosted instance is restricted. GitHub does not recognise the file as plain MIT because of that note.
