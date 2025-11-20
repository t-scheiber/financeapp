// Sentiment Analysis using Hugging Face Inference API (Free Tier)
// API Key: Get from https://huggingface.co/settings/tokens
// Model: distilbert-base-uncased-finetuned-sst-2-english

interface HuggingFaceResponse {
  label: string; // "POSITIVE" or "NEGATIVE"
  score: number; // confidence score 0-1
}

export type SentimentLabel = "positive" | "negative" | "neutral";

interface SentimentResult {
  sentiment: SentimentLabel;
  confidence: number;
}

export class SentimentAPI {
  private apiKey: string;
  private modelUrl =
    "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY || "";
  }

  /**
   * Analyze sentiment of a text using Hugging Face model
   * Returns: positive, negative, or neutral
   */
  async analyzeSentiment(text: string): Promise<SentimentResult> {
    // Return neutral if no API key or empty text
    if (!this.apiKey || !text || text.trim().length === 0) {
      return { sentiment: "neutral", confidence: 0 };
    }

    try {
      // Truncate text to avoid API limits (max 512 tokens for BERT models)
      const truncatedText = text.substring(0, 500);

      const response = await fetch(this.modelUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: truncatedText,
          options: {
            wait_for_model: true, // Wait if model is loading
          },
        }),
      });

      if (!response.ok) {
        // Handle rate limiting or errors gracefully
        if (response.status === 429) {
          return { sentiment: "neutral", confidence: 0 };
        }
        throw new Error(`Hugging Face API error: ${response.status}`);
      }

      const data: HuggingFaceResponse[][] = await response.json();

      // API returns array of arrays, get the first result with highest score
      if (!data || !data[0] || data[0].length === 0) {
        return { sentiment: "neutral", confidence: 0 };
      }

      // Sort by confidence and get the top prediction
      const predictions = data[0].sort((a, b) => b.score - a.score);
      const topPrediction = predictions[0];

      // Map Hugging Face labels to our sentiment labels
      const sentiment: SentimentLabel =
        topPrediction.label === "POSITIVE"
          ? "positive"
          : topPrediction.label === "NEGATIVE"
            ? "negative"
            : "neutral";

      return {
        sentiment,
        confidence: Math.round(topPrediction.score * 100) / 100,
      };
    } catch {
      // Return neutral on error to not break the flow
      return { sentiment: "neutral", confidence: 0 };
    }
  }

  /**
   * Analyze sentiment of news article (title + summary)
   * Gives more weight to title
   */
  async analyzeNews(title: string, summary?: string): Promise<SentimentResult> {
    // Combine title and summary, giving more weight to title
    const text = summary
      ? `${title}. ${title}. ${summary}` // Title twice for emphasis
      : title;

    return this.analyzeSentiment(text);
  }

  /**
   * Batch analyze multiple texts with rate limiting
   * Adds delay between requests to respect free tier limits
   */
  async analyzeBatch(
    texts: string[],
    delayMs: number = 1000,
  ): Promise<SentimentResult[]> {
    const results: SentimentResult[] = [];

    for (const text of texts) {
      const result = await this.analyzeSentiment(text);
      results.push(result);

      // Add delay between requests to avoid rate limiting
      if (delayMs > 0 && texts.indexOf(text) < texts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  /**
   * Get sentiment emoji for display
   */
  static getSentimentEmoji(sentiment: SentimentLabel): string {
    switch (sentiment) {
      case "positive":
        return "😊";
      case "negative":
        return "😟";
      default:
        return "😐";
    }
  }

  /**
   * Get sentiment color for UI
   */
  static getSentimentColor(sentiment: SentimentLabel): string {
    switch (sentiment) {
      case "positive":
        return "text-green-600 bg-green-50 border-green-200";
      case "negative":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  }
}
