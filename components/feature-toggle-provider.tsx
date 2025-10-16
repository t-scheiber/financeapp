"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type FeatureToggleKey =
  | "forecasting"
  | "marketComparisons"
  | "portfolioAnalytics"
  | "sentimentSignals";

export type FeatureToggleState = Record<FeatureToggleKey, boolean>;

const DEFAULT_TOGGLES: FeatureToggleState = {
  forecasting: true,
  marketComparisons: true,
  portfolioAnalytics: true,
  sentimentSignals: true,
};

export const featureToggleDefinitions: Array<{
  key: FeatureToggleKey;
  label: string;
  description: string;
}> = [
  {
    key: "forecasting",
    label: "Predictive forecasting",
    description:
      "Show AI-assisted price projections and confidence scoring on company pages.",
  },
  {
    key: "marketComparisons",
    label: "Market comparisons",
    description:
      "Contrast company performance with tracked indices using stored market data.",
  },
  {
    key: "portfolioAnalytics",
    label: "Portfolio analytics",
    description:
      "Calculate portfolio statistics (return, volatility, Sharpe) when editing holdings.",
  },
  {
    key: "sentimentSignals",
    label: "Sentiment signals",
    description:
      "Display sentiment badges and hover details for news sourced from cron refreshes.",
  },
];

const STORAGE_KEY = "financeapp-feature-toggles";

interface FeatureToggleContextValue {
  toggles: FeatureToggleState;
  isReady: boolean;
  updateToggle: (key: FeatureToggleKey, value: boolean) => void;
  reset: () => void;
}

const FeatureToggleContext = createContext<FeatureToggleContextValue | null>(
  null,
);

function readStoredToggles(): FeatureToggleState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FeatureToggleState>;
    return {
      forecasting:
        typeof parsed.forecasting === "boolean"
          ? parsed.forecasting
          : DEFAULT_TOGGLES.forecasting,
      marketComparisons:
        typeof parsed.marketComparisons === "boolean"
          ? parsed.marketComparisons
          : DEFAULT_TOGGLES.marketComparisons,
      portfolioAnalytics:
        typeof parsed.portfolioAnalytics === "boolean"
          ? parsed.portfolioAnalytics
          : DEFAULT_TOGGLES.portfolioAnalytics,
      sentimentSignals:
        typeof parsed.sentimentSignals === "boolean"
          ? parsed.sentimentSignals
          : DEFAULT_TOGGLES.sentimentSignals,
    };
  } catch {
    return null;
  }
}

export function FeatureToggleProvider({ children }: { children: ReactNode }) {
  const [toggles, setToggles] = useState<FeatureToggleState>(DEFAULT_TOGGLES);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = readStoredToggles();
    if (stored) {
      setToggles(stored);
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toggles));
    } catch {
      // Ignore storage failures (e.g. privacy mode).
    }
  }, [toggles, isReady]);

  const updateToggle = useCallback((key: FeatureToggleKey, value: boolean) => {
    setToggles((prev) => {
      if (prev[key] === value) {
        return prev;
      }
      return {
        ...prev,
        [key]: value,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setToggles(DEFAULT_TOGGLES);
  }, []);

  const value = useMemo<FeatureToggleContextValue>(
    () => ({
      toggles,
      isReady,
      updateToggle,
      reset,
    }),
    [toggles, isReady, updateToggle, reset],
  );

  return (
    <FeatureToggleContext.Provider value={value}>
      {children}
    </FeatureToggleContext.Provider>
  );
}

export function useFeatureToggles() {
  const ctx = useContext(FeatureToggleContext);
  if (!ctx) {
    throw new Error(
      "useFeatureToggles must be used within a FeatureToggleProvider component.",
    );
  }
  return ctx;
}
