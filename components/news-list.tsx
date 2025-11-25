"use client";

import { memo, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface News {
  id: number;
  title: string;
  summary?: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment?: string;
  biasLevel?: string;
  biasType?: string;
  biasWarning?: string;
}

interface NewsListProps {
  news: News[];
  showSentiment?: boolean;
}

// Helper function to get sentiment badge styling
function getSentimentStyle(sentiment?: string) {
  switch (sentiment) {
    case "positive":
      return "bg-accent/10 text-accent border-accent/30";
    case "negative":
      return "bg-destructive/10 text-destructive border-destructive/30";
    case "neutral":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function getSentimentIcon(sentiment?: string) {
  switch (sentiment) {
    case "positive":
      return "😊";
    case "negative":
      return "😟";
    case "neutral":
      return "😐";
    default:
      return "";
  }
}

// Helper function to get bias indicator styling
function getBiasStyle(biasLevel?: string) {
  switch (biasLevel) {
    case "high":
      return "text-amber-600 dark:text-amber-400";
    case "medium":
      return "text-yellow-600 dark:text-yellow-400";
    default:
      return "";
  }
}

function getBiasTypeLabel(biasType?: string) {
  switch (biasType) {
    case "state_media":
      return "State Media";
    case "pr_wire":
      return "Press Release";
    case "promotional":
      return "Promotional";
    case "partisan":
      return "Partisan";
    default:
      return "";
  }
}

// Memoized individual news item
const NewsItem = memo(function NewsItem({
  article,
  showSentiment,
}: {
  article: News;
  showSentiment: boolean;
}) {
  const formattedDate = useMemo(
    () => new Date(article.publishedAt).toLocaleDateString(),
    [article.publishedAt]
  );

  const handleReadMore = () => {
    window.open(article.url, "_blank", "noopener,noreferrer");
  };

  const hasBias = article.biasLevel && article.biasLevel !== "low";

  return (
    <div className="rounded-xl border p-3 transition-colors hover:bg-muted/50 sm:p-4 dark:hover:bg-muted/30">
      <div className="flex flex-col gap-2 mb-2 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="font-semibold text-sm leading-tight flex-1">
          {article.title}
        </h3>
        <div className="flex items-center gap-2 self-start shrink-0">
          {/* Bias indicator */}
          {hasBias && article.biasWarning && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/30 ${getBiasStyle(article.biasLevel)}`}
                >
                  <AlertTriangle className="h-3 w-3" />
                  {getBiasTypeLabel(article.biasType)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-xs">{article.biasWarning}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {/* Sentiment badge */}
          {showSentiment && article.sentiment && (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium border ${getSentimentStyle(article.sentiment)}`}
            >
              {getSentimentIcon(article.sentiment)} {article.sentiment}
            </span>
          )}
        </div>
      </div>
      {article.summary && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 sm:line-clamp-3">
          {article.summary}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground/80 mb-2">
        <span className="font-medium">{article.source}</span>
        <span>{formattedDate}</span>
      </div>
      <Button
        variant="link"
        size="sm"
        className="p-0 h-auto text-xs text-accent hover:text-accent/80"
        onClick={handleReadMore}
      >
        Read full article →
      </Button>
    </div>
  );
});

export const NewsList = memo(function NewsList({
  news,
  showSentiment = true,
}: NewsListProps) {
  if (news.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {news.map((article) => (
        <NewsItem
          key={article.id}
          article={article}
          showSentiment={showSentiment}
        />
      ))}
    </div>
  );
});

