// News API service using NewsAPI (free tier)
// API Key required: Get from https://newsapi.org/

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: Array<{
    source: {
      id: string | null;
      name: string;
    };
    author: string | null;
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    content: string | null;
  }>;
}

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
}

export class NewsAPI {
  private baseUrl = "https://newsapi.org/v2";
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEWS_API_KEY || "";
  }

  async getCompanyNews(
    companyName: string,
    pageSize: number = 10,
  ): Promise<NewsArticle[]> {
    try {
      const query = companyName.toLowerCase();
      // Only fetch news in English (en) for sentiment analysis compatibility
      const response = await fetch(
        `${this.baseUrl}/everything?q="${query}"&language=en&sortBy=publishedAt&pageSize=${pageSize}&apiKey=${this.apiKey}`,
      );

      if (!response.ok) {
        throw new Error(`NewsAPI error: ${response.status}`);
      }

      const data: NewsAPIResponse = await response.json();

      if (data.status !== "ok") {
        throw new Error("NewsAPI returned error status");
      }

      return data.articles.map((article, index) => ({
        id: `${article.url}-${index}`,
        title: article.title,
        summary:
          article.description ||
          `${article.content?.substring(0, 200)}...` ||
          "No description available",
        url: article.url,
        source: article.source.name,
        publishedAt: article.publishedAt,
        imageUrl: article.urlToImage || undefined,
      }));
    } catch {
      return [];
    }
  }

}
