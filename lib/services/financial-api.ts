// Financial data API service using Alpha Vantage (free tier)
// API Key required: Get from https://www.alphavantage.co/support/#api-key

interface AlphaVantageQuote {
  "Global Quote": {
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
    try {
      const response = await fetch(
        `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`,
      );

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }

      const data: AlphaVantageQuote = await response.json();

      if (!data["Global Quote"]) {
        return null;
      }

      const quote = data["Global Quote"];

      return {
        symbol: quote["01. symbol"],
        price: parseFloat(quote["05. price"]),
        open: parseFloat(quote["02. open"]),
        high: parseFloat(quote["03. high"]),
        low: parseFloat(quote["04. low"]),
        volume: parseInt(quote["06. volume"], 10),
        change: parseFloat(quote["09. change"]),
        changePercent: parseFloat(quote["10. change percent"].replace("%", "")),
        date: quote["07. latest trading day"],
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
      };

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
          dividends.push({
            exDividendDate: new Date(date),
            amount: dividendAmount,
            currency: "USD",
          });
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
    try {
      // Note: This is an unofficial API and may break
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      );

      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.chart.result?.[0]) {
        return null;
      }

      const result = data.chart.result[0];
      const meta = result.meta;
      const _quote = result.meta;

      return {
        symbol: meta.symbol,
        price: meta.regularMarketPrice,
        open: meta.regularMarketOpen,
        high: meta.regularMarketDayHigh,
        low: meta.regularMarketDayLow,
        volume: meta.regularMarketVolume,
        change: meta.regularMarketChange,
        changePercent: meta.regularMarketChangePercent * 100,
        date: new Date(meta.regularMarketTime * 1000)
          .toISOString()
          .split("T")[0],
      };
    } catch {
      return null;
    }
  }
}
