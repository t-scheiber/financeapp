// Financial data API service using Alpha Vantage (free tier)
// API Key required: Get from https://www.alphavantage.co/support/#api-key

interface AlphaVantageQuote {
  "Global Quote"?: {
    "01. symbol": string;
    "02. open": string;
    "03. high": string;
    "04. low": string;
    "05. price": string;
    "06. volume": string;
    "07. latest trading day": string;
    "08. previous close": string;
    "09. change": string;
    "10. change percent": string;
  };
  // Alpha Vantage returns a "Note" field when rate limited
  Note?: string;
  // Also returns "Information" for invalid API keys
  Information?: string;
}

interface StockPriceData {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  changePercent: number;
  date: string;
}

export class FinancialAPI {
  private baseUrl = "https://www.alphavantage.co/query";
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ALPHA_VANTAGE_API_KEY || "";
  }

  async getStockQuote(symbol: string): Promise<StockPriceData | null> {
    // Skip placeholder symbols that won't work with Alpha Vantage
    if (!symbol || symbol.startsWith("ISIN-")) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`,
      );

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }

      const data: AlphaVantageQuote = await response.json();

      // Check for rate limiting or invalid API key
      if (data.Note || data.Information) {
        // Rate limited or invalid key - return null to try fallback
        return null;
      }

      if (!data["Global Quote"] || !data["Global Quote"]["05. price"]) {
        return null;
      }

      const quote = data["Global Quote"];

      // Parse and validate numeric values
      const price = parseFloat(quote["05. price"]);
      const open = parseFloat(quote["02. open"]);
      const high = parseFloat(quote["03. high"]);
      const low = parseFloat(quote["04. low"]);
      const volume = parseInt(quote["06. volume"], 10);
      const change = parseFloat(quote["09. change"]);
      const changePercent = parseFloat(quote["10. change percent"]?.replace("%", "") || "0");

      // Validate that we have a valid price at minimum
      if (!Number.isFinite(price) || price <= 0) {
        return null;
      }

      return {
        symbol: quote["01. symbol"] || symbol,
        price,
        open: Number.isFinite(open) ? open : price,
        high: Number.isFinite(high) ? high : price,
        low: Number.isFinite(low) ? low : price,
        volume: Number.isFinite(volume) ? volume : 0,
        change: Number.isFinite(change) ? change : 0,
        changePercent: Number.isFinite(changePercent) ? changePercent : 0,
        date: quote["07. latest trading day"] || new Date().toISOString().split("T")[0],
      };
    } catch {
      return null;
    }
  }

  async getDividends(symbol: string): Promise<{
    symbol: string;
    dividends: Array<{
      exDividendDate: Date;
      paymentDate?: Date;
      amount: number;
      currency: string;
    }>;
  }> {
    // Skip placeholder symbols that won't work with Alpha Vantage
    if (!symbol || symbol.startsWith("ISIN-")) {
      return { symbol, dividends: [] };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&apikey=${this.apiKey}`,
      );

      if (!response.ok) {
        throw new Error(`Alpha Vantage dividend error: ${response.status}`);
      }

      const data = (await response.json()) as {
        "Time Series (Daily)"?: Record<
          string,
          {
            "7. dividend amount"?: string;
          }
        >;
        // Check for rate limiting
        Note?: string;
        Information?: string;
      };

      // Check for rate limiting or invalid API key
      if (data.Note || data.Information) {
        return { symbol, dividends: [] };
      }

      const series = data["Time Series (Daily)"];
      if (!series) {
        return { symbol, dividends: [] };
      }

      const dividends: Array<{
        exDividendDate: Date;
        paymentDate?: Date;
        amount: number;
        currency: string;
      }> = [];

      for (const [date, entry] of Object.entries(series)) {
        const dividendAmount = Number.parseFloat(
          entry["7. dividend amount"] ?? "0",
        );
        if (Number.isFinite(dividendAmount) && dividendAmount > 0) {
          const exDate = new Date(date);
          // Validate date is valid
          if (!Number.isNaN(exDate.getTime())) {
            dividends.push({
              exDividendDate: exDate,
              amount: dividendAmount,
              currency: "USD",
            });
          }
        }
        if (dividends.length >= 8) {
          break;
        }
      }

      return {
        symbol,
        dividends: dividends.sort(
          (a, b) => b.exDividendDate.getTime() - a.exDividendDate.getTime(),
        ),
      };
    } catch {
      return {
        symbol,
        dividends: [],
      };
    }
  }

  // Fallback method using Yahoo Finance (unofficial API)
  async getYahooFinanceData(symbol: string): Promise<StockPriceData | null> {
    // Skip placeholder symbols that won't work with Yahoo Finance
    if (!symbol || symbol.startsWith("ISIN-")) {
      return null;
    }

    try {
      // Note: This is an unofficial API and may break
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,
      );

      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.chart?.result?.[0]?.meta) {
        return null;
      }

      const meta = data.chart.result[0].meta;

      // Validate required price field
      const price = meta.regularMarketPrice;
      if (!Number.isFinite(price) || price <= 0) {
        return null;
      }

      // Extract and validate other fields with fallbacks
      const open = Number.isFinite(meta.regularMarketOpen) ? meta.regularMarketOpen : price;
      const high = Number.isFinite(meta.regularMarketDayHigh) ? meta.regularMarketDayHigh : price;
      const low = Number.isFinite(meta.regularMarketDayLow) ? meta.regularMarketDayLow : price;
      const volume = Number.isFinite(meta.regularMarketVolume) ? meta.regularMarketVolume : 0;
      const change = Number.isFinite(meta.regularMarketChange) ? meta.regularMarketChange : 0;
      const changePercent = Number.isFinite(meta.regularMarketChangePercent) 
        ? meta.regularMarketChangePercent * 100 
        : 0;

      // Parse date with fallback to today
      let date: string;
      if (meta.regularMarketTime && Number.isFinite(meta.regularMarketTime)) {
        date = new Date(meta.regularMarketTime * 1000).toISOString().split("T")[0];
      } else {
        date = new Date().toISOString().split("T")[0];
      }

      return {
        symbol: meta.symbol || symbol,
        price,
        open,
        high,
        low,
        volume,
        change,
        changePercent,
        date,
      };
    } catch {
      return null;
    }
  }
}
