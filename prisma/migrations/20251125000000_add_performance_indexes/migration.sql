-- Performance optimization indexes

-- Index for stock prices lookup by company and date
CREATE INDEX IF NOT EXISTS `stock_prices_company_date_idx` ON `stock_prices` (`companyId`, `date` DESC);

-- Index for news lookup by company and publish date
CREATE INDEX IF NOT EXISTS `news_company_published_idx` ON `news` (`companyId`, `publishedAt` DESC);

-- Index for dividends lookup by company and date
CREATE INDEX IF NOT EXISTS `dividends_company_date_idx` ON `dividends` (`companyId`, `exDividendDate` DESC);

-- Index for session token lookup (auth performance)
CREATE INDEX IF NOT EXISTS `sessions_token_idx` ON `sessions` (`token`);

-- Index for user email lookup
CREATE INDEX IF NOT EXISTS `users_email_idx` ON `users` (`email`);

-- Index for price cache lookup
CREATE INDEX IF NOT EXISTS `price_cache_symbol_expires_idx` ON `price_cache` (`symbol`, `expiresAt`);

