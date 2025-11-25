// Sentiment Analysis using Hugging Face Inference API (Free Tier)
// API Key: Get from https://huggingface.co/settings/tokens
// Models: cardiffnlp/twitter-roberta-base-sentiment-latest (primary)
//         distilbert-base-uncased-finetuned-sst-2-english (fallback)

interface HuggingFaceResponse {
  label: string; // "POSITIVE", "NEGATIVE", "NEUTRAL" or "LABEL_0", "LABEL_1", "LABEL_2"
  score: number; // confidence score 0-1
}

export type SentimentLabel = "positive" | "negative" | "neutral";
export type BiasLevel = "low" | "medium" | "high";
export type BiasType = "state_media" | "pr_wire" | "promotional" | "partisan" | "none";

interface SentimentResult {
  sentiment: SentimentLabel;
  confidence: number;
}

interface BiasAnalysisResult {
  biasLevel: BiasLevel;
  biasType: BiasType;
  biasScore: number; // 0-1, higher = more biased
  warning?: string;
}

interface EnhancedSentimentResult extends SentimentResult {
  bias?: BiasAnalysisResult;
  adjustedSentiment?: SentimentLabel; // Sentiment after bias adjustment
}

// Model URLs - try newer models first
const MODEL_URLS = [
  "https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest",
  "https://api-inference.huggingface.co/models/nlptown/bert-base-multilingual-uncased-sentiment",
  "https://api-inference.huggingface.co/models/distilbert/distilbert-base-uncased-finetuned-sst-2-english",
];

// ============================================================================
// BIAS DETECTION
// ============================================================================

// Known state-controlled or heavily biased media sources
// NOTE: Only sources where content is directly controlled by government
const STATE_MEDIA_SOURCES = [
  // China
  "xinhua", "china daily", "people's daily", "global times", "cgtn", "cctv",
  "china news service",
  // Russia
  "russia today", "sputnik", "tass", "ria novosti",
  // North Korea
  "kcna", "korean central news", "rodong sinmun",
  // Iran
  "press tv", "fars news", "irna", "tasnim",
  // Other state media
  "trt world", "venezuela analysis", "telesur",
];

// Exclude false positives - major news outlets that might match partial patterns
const EXCLUDED_SOURCES = [
  "yahoo", "reuters", "ap news", "associated press", "bbc", "npr",
  "bloomberg", "cnbc", "wsj", "wall street journal", "financial times",
  "the guardian", "washington post", "new york times", "cnn",
];

// PR newswire services (often publish unedited press releases)
const PR_WIRE_SOURCES = [
  "globenewswire", "prnewswire", "pr newswire", "businesswire", "business wire",
  "accesswire", "cision", "marketwatch press", "pomerantz", "law firm",
  "announces investigation", "securities fraud", "investor alert",
];

// Partisan/advocacy sources
const PARTISAN_SOURCES = [
  "breitbart", "infowars", "daily caller", "the blaze",
  "occupy democrats", "daily kos", "motherjones",
];

// Promotional language patterns (suggests PR/marketing content)
const PROMOTIONAL_PATTERNS = [
  /\b(revolutionary|game-?changing|world-?class|best-?in-?class)\b/i,
  /\b(unprecedented success|record-?breaking|industry-?leading)\b/i,
  /\b(proud to announce|excited to|thrilled to|pleased to announce)\b/i,
  /\b(transforming|disrupting|reimagining) the (industry|market|world)\b/i,
  /\b(synerg|leverage|optimize|maximize|streamline)\b/i,
  /\bcontact:\s*\S+@\S+/i, // Press release contact info
  /\bfor (immediate|more) (release|information)/i,
  /\bforward-?looking statements?\b/i,
  /\babout (the company|us|our company)\b/i,
];

// Propaganda language patterns
const PROPAGANDA_PATTERNS = [
  /\b(glorious|heroic|beloved|dear) leader\b/i,
  /\benemy of the (people|state|nation)\b/i,
  /\bimperialist|capitalist running dogs\b/i,
  /\bgreat (victory|achievement|success) of\b/i,
  /\bunanimous(ly)? (support|approve|endorse)\b/i,
  /\b(hostile foreign|western) (forces|powers|influence)\b/i,
];

/**
 * Analyze text and source for potential bias
 */
function analyzeBias(text: string, source?: string): BiasAnalysisResult {
  const lowerText = text.toLowerCase();
  const lowerSource = (source || "").toLowerCase();
  
  let biasScore = 0;
  let biasType: BiasType = "none";
  let warning: string | undefined;

  // First check if source is a trusted major outlet (skip state media check)
  const isTrustedSource = EXCLUDED_SOURCES.some(s => lowerSource.includes(s));

  // Check source-based bias
  if (!isTrustedSource && STATE_MEDIA_SOURCES.some(s => lowerSource.includes(s))) {
    biasScore += 0.7;
    biasType = "state_media";
    warning = "Source is state-controlled media - content may reflect government narrative";
  } else if (PR_WIRE_SOURCES.some(s => lowerSource.includes(s) || lowerText.includes(s))) {
    biasScore += 0.5;
    biasType = "pr_wire";
    warning = "Content appears to be a press release or legal notice - may be promotional";
  } else if (!isTrustedSource && PARTISAN_SOURCES.some(s => lowerSource.includes(s))) {
    biasScore += 0.4;
    biasType = "partisan";
    warning = "Source has known partisan bias";
  }

  // Check for promotional language patterns
  let promoMatches = 0;
  for (const pattern of PROMOTIONAL_PATTERNS) {
    if (pattern.test(text)) {
      promoMatches++;
    }
  }
  if (promoMatches >= 2) {
    biasScore += 0.3;
    if (biasType === "none") {
      biasType = "promotional";
      warning = "Content contains promotional language patterns";
    }
  }

  // Check for propaganda patterns (highest bias)
  for (const pattern of PROPAGANDA_PATTERNS) {
    if (pattern.test(text)) {
      biasScore = Math.max(biasScore, 0.9);
      biasType = "state_media";
      warning = "Content contains propaganda language patterns - sentiment likely unreliable";
      break;
    }
  }

  // Determine bias level
  let biasLevel: BiasLevel;
  if (biasScore >= 0.6) {
    biasLevel = "high";
  } else if (biasScore >= 0.3) {
    biasLevel = "medium";
  } else {
    biasLevel = "low";
  }

  return {
    biasLevel,
    biasType,
    biasScore: Math.min(1, biasScore),
    warning,
  };
}

// Keyword-based sentiment analysis as enhancement/fallback
const POSITIVE_KEYWORDS = [
  "surge", "soar", "jump", "gain", "rise", "growth", "profit", "success",
  "breakthrough", "record", "beat", "exceed", "outperform", "upgrade",
  "bullish", "rally", "boom", "optimistic", "strong", "robust", "expand",
  "innovation", "launch", "win", "award", "milestone", "achieve", "exceed",
  "positive", "improve", "recovery", "rebound", "upturn", "benefit",
  "opportunity", "promising", "confident", "momentum", "upbeat", "celebrate"
];

const NEGATIVE_KEYWORDS = [
  "crash", "plunge", "drop", "fall", "decline", "loss", "fail", "miss",
  "cut", "layoff", "downgrade", "bearish", "slump", "tumble", "sink",
  "weak", "concern", "risk", "warning", "lawsuit", "investigation", "fraud",
  "scandal", "recall", "bankruptcy", "debt", "default", "crisis", "trouble",
  "struggle", "disappointing", "downturn", "pessimistic", "volatile", "fear",
  "uncertainty", "threat", "penalty", "fine", "violation", "controversy"
];

/**
 * Analyze text using keyword matching
 * Returns sentiment based on keyword frequency
 */
function analyzeKeywords(text: string): { sentiment: SentimentLabel; score: number } {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  
  let positiveScore = 0;
  let negativeScore = 0;
  
  for (const word of words) {
    // Check exact word matches and partial matches for compound words
    if (POSITIVE_KEYWORDS.some(kw => word.includes(kw) || kw.includes(word))) {
      positiveScore++;
    }
    if (NEGATIVE_KEYWORDS.some(kw => word.includes(kw) || kw.includes(word))) {
      negativeScore++;
    }
  }
  
  // Also check for phrases in the full text
  for (const keyword of POSITIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) positiveScore += 0.5;
  }
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) negativeScore += 0.5;
  }
  
  const total = positiveScore + negativeScore;
  if (total === 0) {
    return { sentiment: "neutral", score: 0.5 };
  }
  
  const positiveRatio = positiveScore / total;
  const negativeRatio = negativeScore / total;
  
  // Require a clear winner (at least 60% of signals)
  if (positiveRatio > 0.6) {
    return { sentiment: "positive", score: Math.min(0.9, 0.5 + positiveRatio * 0.4) };
  } else if (negativeRatio > 0.6) {
    return { sentiment: "negative", score: Math.min(0.9, 0.5 + negativeRatio * 0.4) };
  }
  
  return { sentiment: "neutral", score: 0.5 };
}

export class SentimentAPI {
  private apiKey: string;
  private workingModelUrl: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY || "";
  }

  /**
   * Try to call a model URL and return predictions
   */
  private async tryModel(modelUrl: string, text: string): Promise<HuggingFaceResponse[] | null> {
    try {
      const response = await fetch(modelUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text,
          options: {
            wait_for_model: true,
          },
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      // Handle different response formats
      if (Array.isArray(data)) {
        if (Array.isArray(data[0])) {
          return data[0] as HuggingFaceResponse[];
        } else if (data[0] && typeof data[0] === 'object' && 'label' in data[0]) {
          return data as HuggingFaceResponse[];
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Analyze sentiment of a text using Hugging Face model
   * Enhanced with keyword analysis for better accuracy
   * Returns: positive, negative, or neutral
   */
  async analyzeSentiment(text: string): Promise<SentimentResult> {
    // Return neutral if empty text
    if (!text || text.trim().length === 0) {
      return { sentiment: "neutral", confidence: 0 };
    }

    // Get keyword-based analysis first (always available)
    const keywordResult = analyzeKeywords(text);

    // If no API key, use keyword analysis only
    if (!this.apiKey) {
      return {
        sentiment: keywordResult.sentiment,
        confidence: keywordResult.score,
      };
    }

    try {
      // Truncate text to avoid API limits (max 512 tokens for BERT models)
      const truncatedText = text.substring(0, 500);

      let predictions: HuggingFaceResponse[] | null = null;

      // Try the cached working model first
      if (this.workingModelUrl) {
        predictions = await this.tryModel(this.workingModelUrl, truncatedText);
      }

      // If no working model cached or it failed, try all models
      if (!predictions) {
        for (const modelUrl of MODEL_URLS) {
          predictions = await this.tryModel(modelUrl, truncatedText);
          if (predictions && predictions.length > 0) {
            this.workingModelUrl = modelUrl; // Cache the working model
            break;
          }
        }
      }

      if (!predictions || predictions.length === 0) {
        return {
          sentiment: keywordResult.sentiment,
          confidence: keywordResult.score,
        };
      }

      // Sort by confidence and get the top prediction
      predictions.sort((a, b) => b.score - a.score);
      const topPrediction = predictions[0];

      // Map Hugging Face labels to our sentiment labels
      // Different models use different label formats:
      // - cardiffnlp/twitter-roberta-base-sentiment-latest: "positive", "negative", "neutral"
      // - nlptown/bert-base-multilingual-uncased-sentiment: "1 star" to "5 stars"
      // - distilbert: "POSITIVE", "NEGATIVE"
      // - Some models: "LABEL_0", "LABEL_1", "LABEL_2"
      let apiSentiment: SentimentLabel;
      const label = topPrediction.label.toLowerCase();
      
      if (label.includes("positive") || label === "label_2" || label.includes("5 star") || label.includes("4 star")) {
        apiSentiment = "positive";
      } else if (label.includes("negative") || label === "label_0" || label.includes("1 star") || label.includes("2 star")) {
        apiSentiment = "negative";
      } else {
        apiSentiment = "neutral";
      }

      const apiConfidence = topPrediction.score;

      // Combine API result with keyword analysis for better accuracy
      // If both agree, boost confidence. If they disagree, use keyword analysis
      // as a tie-breaker for low-confidence API results
      if (apiSentiment === keywordResult.sentiment) {
        // Both agree - high confidence
        return {
          sentiment: apiSentiment,
          confidence: Math.min(0.99, (apiConfidence + keywordResult.score) / 2 + 0.1),
        };
      } else if (apiConfidence > 0.85) {
        // API is very confident - trust it
        return {
          sentiment: apiSentiment,
          confidence: apiConfidence,
        };
      } else if (keywordResult.sentiment !== "neutral" && keywordResult.score > 0.7) {
        // Keyword analysis has strong signal - use it
        return {
          sentiment: keywordResult.sentiment,
          confidence: keywordResult.score,
        };
      } else {
        // Default to API result with adjusted confidence
        return {
          sentiment: apiSentiment,
          confidence: apiConfidence * 0.9,
        };
      }
    } catch (error) {
      // Return keyword analysis on error
      console.warn("Sentiment API error, using keyword analysis:", error);
      return {
        sentiment: keywordResult.sentiment,
        confidence: keywordResult.score,
      };
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
   * Enhanced analysis with bias detection
   * Use this for full news article analysis including source credibility
   */
  async analyzeNewsWithBias(
    title: string,
    summary?: string,
    source?: string
  ): Promise<EnhancedSentimentResult> {
    const text = summary
      ? `${title}. ${title}. ${summary}`
      : title;

    // Get base sentiment
    const sentimentResult = await this.analyzeSentiment(text);
    
    // Analyze bias
    const biasResult = analyzeBias(text, source);
    
    // Adjust sentiment based on bias
    let adjustedSentiment = sentimentResult.sentiment;
    
    if (biasResult.biasLevel === "high") {
      // High bias sources - be skeptical of positive sentiment
      if (sentimentResult.sentiment === "positive") {
        // If it's promotional content, consider neutral
        if (biasResult.biasType === "pr_wire" || biasResult.biasType === "promotional") {
          adjustedSentiment = "neutral";
        }
      }
    }
    
    return {
      sentiment: sentimentResult.sentiment,
      confidence: sentimentResult.confidence,
      bias: biasResult,
      adjustedSentiment,
    };
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

  /**
   * Get bias level emoji/icon for display
   */
  static getBiasEmoji(biasLevel: BiasLevel): string {
    switch (biasLevel) {
      case "high":
        return "⚠️";
      case "medium":
        return "⚡";
      default:
        return "";
    }
  }

  /**
   * Standalone bias analysis (can be called without sentiment)
   */
  static analyzeBias(text: string, source?: string): BiasAnalysisResult {
    return analyzeBias(text, source);
  }
}
