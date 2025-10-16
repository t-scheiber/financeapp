"use client";

import {
  Info,
  Key,
  Layers,
  ListChecks,
  Loader2,
  Palette,
  Sparkles,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { DesignSettingsForm } from "@/components/design-controls";
import type { FeatureToggleKey } from "@/components/feature-toggle-provider";
import {
  featureToggleDefinitions,
  useFeatureToggles,
} from "@/components/feature-toggle-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UserApiKey {
  id: string;
  provider: "alpha_vantage" | "newsapi" | "huggingface";
  isValid: boolean;
  lastTested?: string | null;
}

interface Watchlist {
  id: string;
  name: string;
  companies: {
    id: number;
    symbol: string;
    name?: string;
    industry?: string | null;
  }[];
}

interface PortfolioHolding {
  id: string;
  companyId: number;
  weight: number;
  company: {
    symbol: string;
    name?: string;
  };
}

interface Portfolio {
  id: string;
  name: string;
  holdings: PortfolioHolding[];
}

interface PriceAlert {
  id: string;
  symbol: string;
  companyName: string;
  direction: "above" | "below";
  threshold: number;
  isActive: boolean;
  lastTriggered?: string | null;
}

type ApiProvider = UserApiKey["provider"];

type ApiKeyFormState = {
  provider: ApiProvider | null;
  value: string;
  submitting: boolean;
  error: string | null;
  message: string | null;
};

type NamedFormState = {
  open: boolean;
  name: string;
  submitting: boolean;
  error: string | null;
};

type WatchlistCompanyFormState = {
  watchlistId: string | null;
  symbol: string;
  label: string;
  category: "equity" | "etf";
  submitting: boolean;
  error: string | null;
  message: string | null;
};

type WatchlistRenameState = {
  watchlistId: string | null;
  name: string;
  submitting: boolean;
  error: string | null;
};

type PortfolioHoldingFormState = {
  portfolioId: string | null;
  symbol: string;
  isin: string;
  weight: string;
  label: string;
  submitting: boolean;
  error: string | null;
  message: string | null;
};

type HoldingEditState = {
  value: string;
  submitting: boolean;
  error: string | null;
};

type PortfolioStats = {
  totalValue: number;
  expectedReturn: number;
  variance: number;
  volatility: number;
  sharpeRatio: number;
  weightSum: number;
  observationCount: number;
  meanReturns: Record<string, number>;
};

type PortfolioFeedbackState = {
  portfolioId: string | null;
  message: string | null;
  type: "success" | "error" | null;
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const [apiKeys, setApiKeys] = useState<UserApiKey[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);

  const [apiKeyForm, setApiKeyForm] = useState<ApiKeyFormState>({
    provider: null,
    value: "",
    submitting: false,
    error: null,
    message: null,
  });

  const [watchlistForm, setWatchlistForm] = useState<NamedFormState>({
    open: false,
    name: "",
    submitting: false,
    error: null,
  });

  const [portfolioForm, setPortfolioForm] = useState<NamedFormState>({
    open: false,
    name: "",
    submitting: false,
    error: null,
  });

  const [watchlistsError, setWatchlistsError] = useState<string | null>(null);
  const [deletingWatchlistId, setDeletingWatchlistId] = useState<string | null>(
    null,
  );
  const [watchlistRename, setWatchlistRename] = useState<WatchlistRenameState>({
    watchlistId: null,
    name: "",
    submitting: false,
    error: null,
  });
  const [removingSymbols, setRemovingSymbols] = useState<Set<string>>(
    () => new Set(),
  );
  const [portfolioEditingId, setPortfolioEditingId] = useState<string | null>(
    null,
  );
  const [holdingEdits, setHoldingEdits] = useState<
    Record<string, HoldingEditState>
  >({});
  const [holdingForm, setHoldingForm] = useState<PortfolioHoldingFormState>({
    portfolioId: null,
    symbol: "",
    isin: "",
    weight: "",
    label: "",
    submitting: false,
    error: null,
    message: null,
  });
  const [portfolioFeedback, setPortfolioFeedback] =
    useState<PortfolioFeedbackState>({
      portfolioId: null,
      message: null,
      type: null,
    });
  const [deletingHoldingIds, setDeletingHoldingIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [optimisingPortfolioId, setOptimisingPortfolioId] = useState<
    string | null
  >(null);
  const [portfolioStats, setPortfolioStats] = useState<
    Record<
      string,
      {
        data: PortfolioStats | null;
        loading: boolean;
        error: string | null;
      }
    >
  >({});
  const {
    toggles: featureToggles,
    isReady: featureTogglesReady,
    updateToggle: updateFeatureToggle,
    reset: resetFeatureToggles,
  } = useFeatureToggles();

  const formatWeightValue = (weight: number) =>
    Number.isFinite(weight) ? Number(weight.toFixed(4)).toString() : "";

  const formatPercentage = (value: number) =>
    `${Number.isFinite(value) ? (value * 100).toFixed(2) : "0.00"}%`;

  const createHoldingEdits = (portfolio: Portfolio) => {
    const map: Record<string, HoldingEditState> = {};
    portfolio.holdings.forEach((holding) => {
      map[holding.id] = {
        value: formatWeightValue(holding.weight),
        submitting: false,
        error: null,
      };
    });
    return map;
  };

  const resetHoldingFormState = (portfolioId: string | null) => {
    setHoldingForm({
      portfolioId,
      symbol: "",
      isin: "",
      weight: "",
      label: "",
      submitting: false,
      error: null,
      message: null,
    });
  };

  const applyPortfolioUpdate = (updated: Portfolio) => {
    setPortfolios((prev) =>
      prev.map((portfolio) =>
        portfolio.id === updated.id ? updated : portfolio,
      ),
    );
    if (portfolioEditingId === updated.id) {
      setHoldingEdits(createHoldingEdits(updated));
      resetHoldingFormState(updated.id);
    }
  };

  const loadPortfolioStats = async (
    portfolioId: string,
    options: { force?: boolean } = {},
  ) => {
    let shouldFetch = true;

    setPortfolioStats((prev) => {
      const current = prev[portfolioId];
      if (!options.force && current?.loading) {
        shouldFetch = false;
        return prev;
      }
      if (
        !options.force &&
        current &&
        current.data &&
        !current.loading &&
        !current.error
      ) {
        shouldFetch = false;
        return prev;
      }

      return {
        ...prev,
        [portfolioId]: {
          data: current?.data ?? null,
          loading: true,
          error: null,
        },
      };
    });

    if (!shouldFetch) {
      return;
    }

    try {
      const response = await fetch(`/api/user/portfolios/${portfolioId}/stats`);

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const errorMessage =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : "Failed to load portfolio analytics.";
        setPortfolioStats((prev) => ({
          ...prev,
          [portfolioId]: {
            data: prev[portfolioId]?.data ?? null,
            loading: false,
            error: errorMessage,
          },
        }));
        return;
      }

      const body = (await response.json()) as { stats?: PortfolioStats };

      setPortfolioStats((prev) => ({
        ...prev,
        [portfolioId]: {
          data: body?.stats ?? null,
          loading: false,
          error: null,
        },
      }));
    } catch (error) {
      console.error("Error loading portfolio analytics:", error);
      setPortfolioStats((prev) => ({
        ...prev,
        [portfolioId]: {
          data: prev[portfolioId]?.data ?? null,
          loading: false,
          error: "Unexpected error loading portfolio analytics.",
        },
      }));
    }
  };
  const [companyForm, setCompanyForm] = useState<WatchlistCompanyFormState>({
    watchlistId: null,
    symbol: "",
    label: "",
    category: "equity",
    submitting: false,
    error: null,
    message: null,
  });
  const [notificationPreference, setNotificationPreference] = useState<{
    emailEnabled: boolean;
  } | null>(null);
  const [emailPrefUpdating, setEmailPrefUpdating] = useState(false);
  const [emailPrefError, setEmailPrefError] = useState<string | null>(null);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [priceAlertForm, setPriceAlertForm] = useState<{
    symbol: string;
    threshold: string;
    direction: "above" | "below";
    label: string;
    submitting: boolean;
  }>({
    symbol: "",
    threshold: "",
    direction: "above",
    label: "",
    submitting: false,
  });
  const [priceAlertMessage, setPriceAlertMessage] = useState<string | null>(
    null,
  );
  const [priceAlertError, setPriceAlertError] = useState<string | null>(null);
  const [priceAlertDeletingId, setPriceAlertDeletingId] = useState<
    string | null
  >(null);

  const fetchSettings = useCallback(async () => {
    try {
      const [
        apiKeysRes,
        watchlistsRes,
        portfoliosRes,
        preferenceRes,
        priceAlertsRes,
      ] = await Promise.all([
        fetch("/api/user/api-keys"),
        fetch("/api/user/watchlists"),
        fetch("/api/user/portfolios"),
        fetch("/api/user/notifications/preferences"),
        fetch("/api/user/price-alerts"),
      ]);

      if (apiKeysRes.ok) {
        const apiKeysData = (await apiKeysRes.json()) as UserApiKey[];
        setApiKeys(apiKeysData);
      }

      if (watchlistsRes.ok) {
        const watchlistsData = (await watchlistsRes.json()) as Watchlist[];
        setWatchlists(watchlistsData);
        setWatchlistsError(null);
      }

      if (portfoliosRes.ok) {
        const portfoliosData = (await portfoliosRes.json()) as Portfolio[];
        setPortfolios(portfoliosData);
      }

      if (preferenceRes.ok) {
        const preference = (await preferenceRes.json()) as {
          emailEnabled: boolean;
        };
        setNotificationPreference(preference);
        setEmailPrefError(null);
      }

      if (priceAlertsRes.ok) {
        const alerts = (await priceAlertsRes.json()) as PriceAlert[];
        setPriceAlerts(alerts);
        setPriceAlertError(null);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      void fetchSettings();
    }
  }, [session, fetchSettings]);

  const reloadApiKeys = useCallback(async () => {
    try {
      const response = await fetch("/api/user/api-keys", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as UserApiKey[];
      setApiKeys(data);
    } catch (error) {
      console.error("Error refreshing API keys:", error);
    }
  }, []);

  const handleEmailPreferenceToggle = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const enabled = event.target.checked;
    const previousEnabled = notificationPreference?.emailEnabled ?? true;
    setNotificationPreference({ emailEnabled: enabled });
    setEmailPrefUpdating(true);
    setEmailPrefError(null);

    try {
      const response = await fetch("/api/user/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailEnabled: enabled }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const errorMessage =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : "Failed to update preferences.";
        setNotificationPreference({ emailEnabled: previousEnabled });
        setEmailPrefError(errorMessage);
        return;
      }

      const updated = (await response.json()) as { emailEnabled: boolean };
      setNotificationPreference(updated);
    } catch (error) {
      console.error("Error updating notification preference:", error);
      setNotificationPreference({ emailEnabled: previousEnabled });
      setEmailPrefError("Unexpected error updating preferences.");
    } finally {
      setEmailPrefUpdating(false);
    }
  };

  const handlePriceAlertInputChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target;
    setPriceAlertMessage(null);
    setPriceAlertError(null);
    setPriceAlertForm((prev) => {
      if (name === "symbol") {
        return { ...prev, symbol: value.toUpperCase() };
      }
      if (name === "threshold") {
        return { ...prev, threshold: value };
      }
      if (name === "label") {
        return { ...prev, label: value };
      }
      return prev;
    });
  };

  const handlePriceAlertDirectionChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    const direction = event.target.value === "below" ? "below" : "above";
    setPriceAlertMessage(null);
    setPriceAlertError(null);
    setPriceAlertForm((prev) => ({
      ...prev,
      direction,
    }));
  };

  const handlePriceAlertSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPriceAlertMessage(null);
    setPriceAlertError(null);

    const symbol = priceAlertForm.symbol.trim().toUpperCase();
    if (!symbol) {
      setPriceAlertError("Enter a ticker symbol to continue.");
      return;
    }

    const thresholdValue = parseFloat(priceAlertForm.threshold);
    if (!Number.isFinite(thresholdValue) || thresholdValue <= 0) {
      setPriceAlertError("Enter a threshold above zero.");
      return;
    }

    setPriceAlertForm((prev) => ({ ...prev, submitting: true }));

    try {
      const response = await fetch("/api/user/price-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          threshold: thresholdValue,
          direction: priceAlertForm.direction,
          label: priceAlertForm.label.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const errorMessage =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : "Failed to create price alert.";
        setPriceAlertError(errorMessage);
        return;
      }

      const body = (await response.json()) as {
        success?: boolean;
        alreadyExists?: boolean;
        alert?: PriceAlert;
      };

      if (body?.alert) {
        const alert = body.alert;
        setPriceAlerts((prev) => [
          alert,
          ...prev.filter((item) => item.id !== alert.id),
        ]);
      }

      setPriceAlertMessage(
        body?.alreadyExists
          ? `${symbol} alert already exists.`
          : `${symbol} alert saved.`,
      );
      setPriceAlertForm({
        symbol: "",
        threshold: "",
        direction: "above",
        label: "",
        submitting: false,
      });
    } catch (error) {
      console.error("Error creating price alert:", error);
      setPriceAlertError("Unexpected error creating price alert.");
    } finally {
      setPriceAlertForm((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleDeletePriceAlert = async (alertId: string) => {
    if (priceAlertDeletingId) {
      return;
    }
    const confirmDelete = window.confirm(
      "Delete this price alert? This cannot be undone.",
    );
    if (!confirmDelete) {
      return;
    }

    setPriceAlertDeletingId(alertId);
    setPriceAlertError(null);
    setPriceAlertMessage(null);

    try {
      const response = await fetch(`/api/user/price-alerts/${alertId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const errorMessage =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : "Failed to delete price alert.";
        setPriceAlertError(errorMessage);
        return;
      }

      setPriceAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    } catch (error) {
      console.error("Error deleting price alert:", error);
      setPriceAlertError("Unexpected error deleting price alert.");
    } finally {
      setPriceAlertDeletingId(null);
    }
  };

  const openApiKeyForm = (provider: ApiProvider) => {
    setApiKeyForm({
      provider,
      value: "",
      submitting: false,
      error: null,
      message: null,
    });
  };

  const closeApiKeyForm = () => {
    setApiKeyForm({
      provider: null,
      value: "",
      submitting: false,
      error: null,
      message: null,
    });
  };

  const handleApiKeyValueChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setApiKeyForm((prev) => ({
      ...prev,
      value,
      error: null,
      message: null,
    }));
  };

  const handleApiKeySubmit = async (
    event: FormEvent<HTMLFormElement>,
    provider: ApiProvider,
  ) => {
    event.preventDefault();

    const trimmedValue = apiKeyForm.value.trim();
    if (!trimmedValue) {
      setApiKeyForm((prev) => ({
        ...prev,
        error: "Enter an API key to continue.",
        message: null,
      }));
      return;
    }

    setApiKeyForm((prev) => ({
      ...prev,
      submitting: true,
      error: null,
      message: null,
    }));

    try {
      const response = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider, apiKey: trimmedValue }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const errorMessage =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : "Failed to save API key.";
        setApiKeyForm((prev) => ({
          ...prev,
          submitting: false,
          error: errorMessage,
        }));
        return;
      }

      const body = (await response.json()) as {
        validation?: { message?: string };
      };

      await reloadApiKeys();

      setApiKeyForm((prev) => ({
        ...prev,
        submitting: false,
        message: body?.validation?.message ?? "API key saved.",
        value: "",
      }));
    } catch (error) {
      console.error("Error saving API key:", error);
      setApiKeyForm((prev) => ({
        ...prev,
        submitting: false,
        error: "Unexpected error saving API key.",
      }));
    }
  };

  const toggleWatchlistForm = () => {
    setWatchlistForm((prev) => {
      if (prev.submitting) {
        return prev;
      }
      if (prev.open) {
        return { open: false, name: "", submitting: false, error: null };
      }
      return { open: true, name: "", submitting: false, error: null };
    });
  };

  const handleWatchlistNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setWatchlistForm((prev) => ({
      ...prev,
      name: value,
      error: null,
    }));
  };

  const handleWatchlistSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = watchlistForm.name.trim();
    if (!trimmedName) {
      setWatchlistForm((prev) => ({
        ...prev,
        error: "Enter a name to continue.",
      }));
      return;
    }

    setWatchlistForm((prev) => ({
      ...prev,
      submitting: true,
      error: null,
    }));

    try {
      const response = await fetch("/api/user/watchlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const errorMessage =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : "Failed to create watchlist.";
        setWatchlistForm((prev) => ({
          ...prev,
          submitting: false,
          error: errorMessage,
        }));
        return;
      }

      const body = (await response.json()) as {
        watchlist?: Watchlist;
      };

      if (body?.watchlist) {
        const created = body.watchlist;
        setWatchlists((prev) => [
          created,
          ...prev.filter((item) => item.id !== created.id),
        ]);
        setWatchlistsError(null);
      }

      setWatchlistForm({
        open: false,
        name: "",
        submitting: false,
        error: null,
      });
    } catch (error) {
      console.error("Error creating watchlist:", error);
      setWatchlistForm((prev) => ({
        ...prev,
        submitting: false,
        error: "Unexpected error creating watchlist.",
      }));
    }
  };

  const togglePortfolioForm = () => {
    setPortfolioForm((prev) => {
      if (prev.submitting) {
        return prev;
      }
      if (prev.open) {
        return { open: false, name: "", submitting: false, error: null };
      }
      return { open: true, name: "", submitting: false, error: null };
    });
  };

  const handlePortfolioNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setPortfolioForm((prev) => ({
      ...prev,
      name: value,
      error: null,
    }));
  };

  const handlePortfolioSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = portfolioForm.name.trim();
    if (!trimmedName) {
      setPortfolioForm((prev) => ({
        ...prev,
        error: "Enter a name to continue.",
      }));
      return;
    }

    setPortfolioForm((prev) => ({
      ...prev,
      submitting: true,
      error: null,
    }));

    try {
      const response = await fetch("/api/user/portfolios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const errorMessage =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : "Failed to create portfolio.";
        setPortfolioForm((prev) => ({
          ...prev,
          submitting: false,
          error: errorMessage,
        }));
        return;
      }

      const body = (await response.json()) as {
        portfolio?: Portfolio;
      };

      if (body?.portfolio) {
        const created = body.portfolio;
        setPortfolios((prev) => [
          created,
          ...prev.filter((item) => item.id !== created.id),
        ]);
      }

      setPortfolioForm({
        open: false,
        name: "",
        submitting: false,
        error: null,
      });
    } catch (error) {
      console.error("Error creating portfolio:", error);
      setPortfolioForm((prev) => ({
        ...prev,
        submitting: false,
        error: "Unexpected error creating portfolio.",
      }));
    }
  };

  const handleFeatureToggleChange =
    (key: FeatureToggleKey) => (event: ChangeEvent<HTMLInputElement>) => {
      updateFeatureToggle(key, event.target.checked);
    };

  const togglePortfolioEditor = (portfolioId: string) => {
    if (portfolioEditingId === portfolioId) {
      setPortfolioEditingId(null);
      setHoldingEdits({});
      resetHoldingFormState(null);
      setPortfolioFeedback({ portfolioId: null, message: null, type: null });
      return;
    }

    const portfolio = portfolios.find((item) => item.id === portfolioId);
    if (portfolio) {
      setHoldingEdits(createHoldingEdits(portfolio));
      resetHoldingFormState(portfolioId);
    } else {
      setHoldingEdits({});
      resetHoldingFormState(portfolioId);
    }
    setPortfolioFeedback({ portfolioId: null, message: null, type: null });
    if (featureToggles.portfolioAnalytics) {
      void loadPortfolioStats(portfolioId);
    } else {
      setPortfolioStats((prev) => ({
        ...prev,
        [portfolioId]: {
          data: null,
          loading: false,
          error: null,
        },
      }));
    }
    setPortfolioEditingId(portfolioId);
  };

  useEffect(() => {
    if (!featureToggles.portfolioAnalytics) {
      setPortfolioStats({});
      setPortfolioFeedback({
        portfolioId: null,
        message: null,
        type: null,
      });
    }
  }, [featureToggles.portfolioAnalytics]);

  const handleHoldingWeightChange = (holdingId: string, value: string) => {
    setHoldingEdits((prev) => {
      const current = prev[holdingId] ?? {
        value: "",
        submitting: false,
        error: null,
      };
      return {
        ...prev,
        [holdingId]: {
          value,
          submitting: current.submitting,
          error: null,
        },
      };
    });
  };

  const handleUpdateHoldingWeight = async (
    holdingId: string,
    portfolioId: string,
  ) => {
    const editState = holdingEdits[holdingId];
    if (!editState) {
      return;
    }

    const parsedWeight = Number.parseFloat(editState.value);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setHoldingEdits((prev) => ({
        ...prev,
        [holdingId]: {
          ...prev[holdingId],
          error: "Weight must be greater than zero.",
        },
      }));
      return;
    }

    setHoldingEdits((prev) => ({
      ...prev,
      [holdingId]: {
        ...prev[holdingId],
        submitting: true,
        error: null,
      },
    }));
    setPortfolioFeedback({ portfolioId: null, message: null, type: null });

    let updatedFromResponse = false;

    try {
      const response = await fetch(
        `/api/user/portfolios/${portfolioId}/holdings/${holdingId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ weight: parsedWeight }),
        },
      );

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const errorMessage =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : "Failed to update holding.";
        setHoldingEdits((prev) => ({
          ...prev,
          [holdingId]: {
            ...prev[holdingId],
            error: errorMessage,
          },
        }));
        setPortfolioFeedback({
          portfolioId,
          message: errorMessage,
          type: "error",
        });
        return;
      }

      const body = (await response.json()) as {
        portfolio?: Portfolio;
        success?: boolean;
      };

      if (body?.portfolio) {
        applyPortfolioUpdate(body.portfolio);
        updatedFromResponse = true;
        setPortfolioFeedback({
          portfolioId,
          message: "Holding weight updated.",
          type: "success",
        });
        if (featureToggles.portfolioAnalytics) {
          void loadPortfolioStats(portfolioId, { force: true });
        }
      }
    } catch (error) {
      console.error("Error updating holding weight:", error);
      setHoldingEdits((prev) => ({
        ...prev,
        [holdingId]: {
          ...prev[holdingId],
          error: "Unexpected error updating holding.",
        },
      }));
      setPortfolioFeedback({
        portfolioId,
        message: "Unexpected error updating holding.",
        type: "error",
      });
    } finally {
      if (!updatedFromResponse) {
        setHoldingEdits((prev) => ({
          ...prev,
          [holdingId]: {
            ...prev[holdingId],
            submitting: false,
          },
        }));
      }
    }
  };

  const handleDeleteHolding = async (
    holdingId: string,
    portfolioId: string,
  ) => {
    setDeletingHoldingIds((prev) => {
      const next = new Set(prev);
      next.add(holdingId);
      return next;
    });
    setPortfolioFeedback({ portfolioId: null, message: null, type: null });

    try {
      const response = await fetch(
        `/api/user/portfolios/${portfolioId}/holdings/${holdingId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const errorMessage =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : "Failed to remove holding.";
        setPortfolioFeedback({
          portfolioId,
          message: errorMessage,
          type: "error",
        });
        return;
      }

      const body = (await response.json()) as {
        portfolio?: Portfolio;
        success?: boolean;
      };

      if (body?.portfolio) {
        applyPortfolioUpdate(body.portfolio);
        setPortfolioFeedback({
          portfolioId,
          message: "Holding removed from portfolio.",
          type: "success",
        });
        if (featureToggles.portfolioAnalytics) {
          void loadPortfolioStats(portfolioId, { force: true });
        }
      }
    } catch (error) {
      console.error("Error deleting holding:", error);
      setPortfolioFeedback({
        portfolioId,
        message: "Unexpected error deleting holding.",
        type: "error",
      });
    } finally {
      setDeletingHoldingIds((prev) => {
        const next = new Set(prev);
        next.delete(holdingId);
        return next;
      });
    }
  };

  const handleHoldingFormInputChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target;
    setHoldingForm((prev) => ({
      ...prev,
      [name]:
        name === "symbol"
          ? value.toUpperCase()
          : name === "isin"
            ? value.toUpperCase()
            : name === "weight"
              ? value
              : value,
      error: null,
      message: null,
    }));
  };

  const handleAddHolding = async (
    event: FormEvent<HTMLFormElement>,
    portfolioId: string,
  ) => {
    event.preventDefault();

    if (holdingForm.portfolioId !== portfolioId) {
      resetHoldingFormState(portfolioId);
      setHoldingForm((prev) => ({
        ...prev,
        error: "Portfolio changed before submission. Please try again.",
        isin: "",
      }));
      return;
    }

    const symbol = holdingForm.symbol.trim().toUpperCase();
    const isin = holdingForm.isin.trim().toUpperCase();
    const parsedWeight = Number.parseFloat(holdingForm.weight);

    if (!symbol && !isin) {
      setHoldingForm((prev) => ({
        ...prev,
        error: "Enter a ticker symbol or ISIN to continue.",
        isin: "",
      }));
      return;
    }

    // Validate ISIN format if provided
    if (isin) {
      const isinPattern = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
      if (!isinPattern.test(isin)) {
        setHoldingForm((prev) => ({
          ...prev,
          error:
            "Invalid ISIN format. Expected format: 2 letters + 9 alphanumeric + 1 digit (e.g., US0378331005)",
          isin: "",
        }));
        return;
      }
    }

    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setHoldingForm((prev) => ({
        ...prev,
        error: "Weight must be greater than zero.",
        isin: "",
      }));
      return;
    }

    setHoldingForm((prev) => ({
      ...prev,
      submitting: true,
      error: null,
      message: null,
      isin: "",
    }));
    setPortfolioFeedback({ portfolioId: null, message: null, type: null });

    try {
      const response = await fetch(
        `/api/user/portfolios/${portfolioId}/holdings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symbol: symbol || undefined,
            isin: isin || undefined,
            weight: parsedWeight,
            label: holdingForm.label.trim() || undefined,
          }),
        },
      );

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const errorMessage =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : "Failed to add holding.";
        setHoldingForm((prev) => ({
          ...prev,
          submitting: false,
          error: errorMessage,
          isin: "",
        }));
        setPortfolioFeedback({
          portfolioId,
          message: errorMessage,
          type: "error",
        });
        return;
      }

      const body = (await response.json()) as {
        portfolio?: Portfolio;
        success?: boolean;
      };

      if (body?.portfolio) {
        applyPortfolioUpdate(body.portfolio);
        const identifier = symbol || isin;
        setPortfolioFeedback({
          portfolioId,
          message: `${identifier} added to portfolio.`,
          type: "success",
        });
        if (featureToggles.portfolioAnalytics) {
          void loadPortfolioStats(portfolioId, { force: true });
        }
      }

      resetHoldingFormState(portfolioId);
    } catch (error) {
      console.error("Error adding holding:", error);
      setHoldingForm((prev) => ({
        ...prev,
        submitting: false,
        error: "Unexpected error adding holding.",
        isin: "",
      }));
      setPortfolioFeedback({
        portfolioId,
        message: "Unexpected error adding holding.",
        type: "error",
      });
    }
  };

  const handleEqualWeightOptimise = async (portfolioId: string) => {
    setOptimisingPortfolioId(portfolioId);
    setPortfolioFeedback({ portfolioId: null, message: null, type: null });

    try {
      const response = await fetch(
        `/api/user/portfolios/${portfolioId}/optimise`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const errorMessage =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : "Failed to optimise portfolio.";
        setPortfolioFeedback({
          portfolioId,
          message: errorMessage,
          type: "error",
        });
        return;
      }

      const body = (await response.json()) as {
        portfolio?: Portfolio;
        success?: boolean;
      };

      if (body?.portfolio) {
        applyPortfolioUpdate(body.portfolio);
        setPortfolioFeedback({
          portfolioId,
          message: "Weights reset to equal allocation.",
          type: "success",
        });
        if (featureToggles.portfolioAnalytics) {
          void loadPortfolioStats(portfolioId, { force: true });
        }
      }
    } catch (error) {
      console.error("Error optimising portfolio:", error);
      setPortfolioFeedback({
        portfolioId,
        message: "Unexpected error optimising portfolio.",
        type: "error",
      });
    } finally {
      setOptimisingPortfolioId(null);
    }
  };

  const closeCompanyForm = () => {
    setCompanyForm({
      watchlistId: null,
      symbol: "",
      label: "",
      category: "equity",
      submitting: false,
      error: null,
      message: null,
    });
  };

  const toggleCompanyForm = (watchlistId: string) => {
    setCompanyForm((prev) => {
      if (prev.submitting && prev.watchlistId === watchlistId) {
        return prev;
      }
      if (prev.watchlistId === watchlistId) {
        return {
          watchlistId: null,
          symbol: "",
          label: "",
          category: "equity",
          submitting: false,
          error: null,
          message: null,
        };
      }
      return {
        watchlistId,
        symbol: "",
        label: "",
        category: "equity",
        submitting: false,
        error: null,
        message: null,
      };
    });
  };

  const handleCompanySymbolChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.toUpperCase();
    setCompanyForm((prev) => ({
      ...prev,
      symbol: value,
      error: null,
      message: null,
    }));
  };

  const handleCompanyLabelChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setCompanyForm((prev) => ({
      ...prev,
      label: value,
      error: null,
      message: null,
    }));
  };

  const handleCompanyCategoryChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    const value = event.target.value === "etf" ? "etf" : "equity";
    setCompanyForm((prev) => ({
      ...prev,
      category: value,
      message: null,
    }));
  };

  const handleAddCompany = async (
    event: FormEvent<HTMLFormElement>,
    watchlistId: string,
  ) => {
    event.preventDefault();

    if (companyForm.watchlistId !== watchlistId) {
      setCompanyForm((prev) => ({
        watchlistId,
        symbol: "",
        label: "",
        category: prev.category,
        submitting: false,
        error: "Watchlist changed before submission. Please try again.",
        message: null,
      }));
      return;
    }

    const symbol = companyForm.symbol.trim().toUpperCase();
    if (!symbol) {
      setCompanyForm((prev) => ({
        ...prev,
        error: "Enter a ticker symbol or ISIN to continue.",
        message: null,
      }));
      return;
    }

    setCompanyForm((prev) => ({
      ...prev,
      submitting: true,
      error: null,
      message: null,
    }));

    try {
      const response = await fetch(
        `/api/user/watchlists/${watchlistId}/companies`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symbol,
            name: companyForm.label.trim() || undefined,
            type: companyForm.category,
          }),
        },
      );

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const errorMessage =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : "Failed to add symbol.";
        setCompanyForm((prev) => ({
          ...prev,
          submitting: false,
          error: errorMessage,
        }));
        return;
      }

      const body = (await response.json()) as {
        success?: boolean;
        alreadyExists?: boolean;
        watchlist?: Watchlist;
      };

      if (body?.watchlist) {
        setWatchlists((prev) =>
          prev.map((item) =>
            item.id === watchlistId && body.watchlist ? body.watchlist : item,
          ),
        );
      }

      setCompanyForm((prev) => ({
        ...prev,
        submitting: false,
        symbol: "",
        label: "",
        error: null,
        message: body?.alreadyExists
          ? `${symbol} is already in this watchlist.`
          : `${symbol} added to watchlist.`,
      }));
    } catch (error) {
      console.error("Error adding symbol to watchlist:", error);
      setCompanyForm((prev) => ({
        ...prev,
        submitting: false,
        error: "Unexpected error adding symbol.",
      }));
    }
  };

  const startWatchlistRename = (watchlist: Watchlist) => {
    setWatchlistRename({
      watchlistId: watchlist.id,
      name: watchlist.name,
      submitting: false,
      error: null,
    });
  };

  const handleWatchlistRenameChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const { value } = event.target;
    setWatchlistRename((prev) =>
      prev.watchlistId
        ? {
            ...prev,
            name: value,
            error: null,
          }
        : prev,
    );
  };

  const cancelWatchlistRename = () => {
    setWatchlistRename({
      watchlistId: null,
      name: "",
      submitting: false,
      error: null,
    });
  };

  const handleWatchlistRename = async (
    event: FormEvent<HTMLFormElement>,
    watchlistId: string,
  ) => {
    event.preventDefault();

    if (watchlistRename.watchlistId !== watchlistId) {
      const current = watchlists.find((item) => item.id === watchlistId);
      setWatchlistRename({
        watchlistId,
        name: current?.name ?? "",
        submitting: false,
        error: "Watchlist changed before saving. Please try again.",
      });
      return;
    }

    const trimmedName = watchlistRename.name.trim();
    if (!trimmedName) {
      setWatchlistRename((prev) => ({
        ...prev,
        error: "Enter a name to continue.",
      }));
      return;
    }

    setWatchlistRename((prev) => ({
      ...prev,
      submitting: true,
      error: null,
    }));
    setWatchlistsError(null);

    try {
      const response = await fetch(`/api/user/watchlists/${watchlistId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const errorMessage =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : "Failed to rename watchlist.";

        setWatchlistRename((prev) => ({
          ...prev,
          submitting: false,
          error: errorMessage,
        }));
        return;
      }

      const body = (await response.json()) as {
        success?: boolean;
        watchlist?: Watchlist;
      };

      if (body?.watchlist) {
        setWatchlists((prev) =>
          prev.map((item) =>
            item.id === watchlistId && body.watchlist ? body.watchlist : item,
          ),
        );
      }

      cancelWatchlistRename();
    } catch (error) {
      console.error("Error renaming watchlist:", error);
      setWatchlistRename((prev) => ({
        ...prev,
        submitting: false,
        error: "Unexpected error renaming watchlist.",
      }));
    }
  };

  const handleRemoveCompany = async (
    watchlistId: string,
    companyId: number,
    symbol: string,
  ) => {
    const removalKey = `${watchlistId}-${companyId}`;
    setRemovingSymbols((prev) => {
      const next = new Set(prev);
      next.add(removalKey);
      return next;
    });
    setWatchlistsError(null);

    try {
      const response = await fetch(
        `/api/user/watchlists/${watchlistId}/companies/${companyId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const errorMessage =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : "Failed to remove symbol.";
        setWatchlistsError(errorMessage);
        return;
      }

      const body = (await response.json()) as {
        success?: boolean;
        watchlist?: Watchlist;
      };

      if (body?.watchlist) {
        setWatchlists((prev) =>
          prev.map((item) =>
            item.id === watchlistId && body.watchlist ? body.watchlist : item,
          ),
        );
      } else {
        setWatchlists((prev) =>
          prev.map((item) =>
            item.id === watchlistId
              ? {
                  ...item,
                  companies: item.companies.filter(
                    (company) => company.id !== companyId,
                  ),
                }
              : item,
          ),
        );
      }

      if (companyForm.watchlistId === watchlistId) {
        setCompanyForm((prev) => ({
          ...prev,
          message: `${symbol} removed from watchlist.`,
          error: null,
        }));
      }
    } catch (error) {
      console.error("Error removing symbol from watchlist:", error);
      setWatchlistsError("Unexpected error removing symbol.");
    } finally {
      setRemovingSymbols((prev) => {
        const next = new Set(prev);
        next.delete(removalKey);
        return next;
      });
    }
  };

  const handleDeleteWatchlist = async (watchlistId: string) => {
    if (deletingWatchlistId) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this watchlist and all its saved symbols?",
    );
    if (!confirmed) {
      return;
    }

    setDeletingWatchlistId(watchlistId);
    setWatchlistsError(null);

    try {
      const response = await fetch(`/api/user/watchlists/${watchlistId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const errorMessage =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : "Failed to delete watchlist.";
        setWatchlistsError(errorMessage);
        return;
      }

      setWatchlists((prev) =>
        prev.filter((watchlist) => watchlist.id !== watchlistId),
      );
      if (companyForm.watchlistId === watchlistId) {
        closeCompanyForm();
      }
    } catch (error) {
      console.error("Error deleting watchlist:", error);
      setWatchlistsError("Unexpected error deleting watchlist.");
    } finally {
      setDeletingWatchlistId(null);
    }
  };

  if (!session) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="glass-panel max-w-md rounded-3xl p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Layers className="h-6 w-6" />
          </div>
          <p className="text-lg font-semibold text-foreground">
            Please sign in to access settings
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Customisation and account preferences are available once you are
            logged in.
          </p>
          <Button asChild className="mt-6">
            <a href="/auth/signin">Go to sign-in</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-3xl p-6 shadow-lg sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <Palette className="h-3.5 w-3.5" />
              Personalise
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Settings & preferences
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Tailor the dashboard experience to suit your workflow, manage API
              credentials, and organise your watchlists and portfolios - all
              from one place.
            </p>
          </div>
          <div className="rounded-3xl border border-border/40 bg-white/70 px-4 py-3 text-sm text-muted-foreground shadow-sm">
            <p className="font-medium text-foreground">
              Design controls live here
            </p>
            <p>
              Use the Experience design panel below or the palette button in the
              header to update the interface.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr]">
        <Card className="glass-panel rounded-3xl border-none shadow-lg">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-3 text-lg">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                  <Sparkles className="h-4 w-4" />
                </span>
                Experience design
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Adjust theme, accent colour, corner radius, and motion level.
                Your preferences stay on this device.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <DesignSettingsForm showReset />
          </CardContent>
        </Card>

        <Card className="glass-panel h-full rounded-3xl border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <Key className="h-4 w-4" />
              </span>
              API Keys
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Securely encrypt credentials for third-party data providers.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {["api-skeleton-1", "api-skeleton-2", "api-skeleton-3"].map(
                  (skeletonKey) => (
                    <div
                      key={skeletonKey}
                      className="skeleton h-[72px] rounded-2xl"
                    />
                  ),
                )}
              </div>
            ) : (
              (
                ["alpha_vantage", "newsapi", "huggingface"] as ApiProvider[]
              ).map((provider) => {
                const key = apiKeys.find((k) => k.provider === provider);
                const providerName = provider.replace("_", " ").toUpperCase();
                const providerInputId = `api-key-${provider}`;

                return (
                  <div
                    key={provider}
                    className="rounded-2xl border border-border/60 bg-white/70 p-4 text-sm shadow-sm"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                          {provider === "alpha_vantage"
                            ? "AV"
                            : provider === "newsapi"
                              ? "NW"
                              : "HF"}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {providerName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {key?.isValid ? "Valid" : "Not configured"}
                            {key?.lastTested
                              ? ` - Tested ${new Date(
                                  key.lastTested,
                                ).toLocaleDateString()}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openApiKeyForm(provider)}
                      >
                        {key ? "Update" : "Add"}
                      </Button>
                    </div>
                    {apiKeyForm.provider === provider ? (
                      <form
                        className="mt-4 space-y-3"
                        onSubmit={(event) =>
                          handleApiKeySubmit(event, provider)
                        }
                      >
                        <div className="space-y-1">
                          <label
                            htmlFor={providerInputId}
                            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                          >
                            API key
                          </label>
                          <Input
                            id={providerInputId}
                            type="password"
                            placeholder="Enter your API key"
                            value={apiKeyForm.value}
                            onChange={handleApiKeyValueChange}
                            disabled={apiKeyForm.submitting}
                            autoFocus
                          />
                        </div>
                        {apiKeyForm.error ? (
                          <p className="text-xs text-red-500">
                            {apiKeyForm.error}
                          </p>
                        ) : null}
                        {apiKeyForm.message ? (
                          <p className="text-xs text-emerald-600">
                            {apiKeyForm.message}
                          </p>
                        ) : null}
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button
                            type="submit"
                            size="sm"
                            disabled={apiKeyForm.submitting}
                          >
                            {apiKeyForm.submitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save Key"
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={closeApiKeyForm}
                            disabled={apiKeyForm.submitting}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="glass-panel rounded-3xl border-none shadow-lg">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-lg">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <Sparkles className="h-4 w-4" />
              </span>
              Feature controls
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Decide which advanced insights appear across the app. Toggles are
              saved locally per device.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetFeatureToggles}
            disabled={!featureTogglesReady}
          >
            Reset to defaults
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {featureToggleDefinitions.map(({ key, label, description }) => {
            const enabled = featureToggles[key];
            return (
              <div
                key={key}
                className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border/60 text-accent focus:ring-accent"
                    checked={enabled}
                    onChange={handleFeatureToggleChange(key)}
                    disabled={!featureTogglesReady}
                  />
                  <span>{enabled ? "Enabled" : "Disabled"}</span>
                </label>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="glass-panel rounded-3xl border-none shadow-lg">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-3 text-lg">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                  <ListChecks className="h-4 w-4" />
                </span>
                <span className="inline-flex items-center gap-2">
                  Watchlists
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                      >
                        <Info className="h-3.5 w-3.5" />
                        <span className="sr-only">What are watchlists?</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-left">
                      Group tickers you care about so we can track prices,
                      sentiment and headlines in one place. Add stocks or ETFs
                      to tailor the dashboard feed.
                    </TooltipContent>
                  </Tooltip>
                </span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Curate companies to track key movements and news signals.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleWatchlistForm}
              disabled={watchlistForm.submitting || loading}
            >
              {watchlistForm.open ? "Close" : "Create New"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {watchlistsError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {watchlistsError}
              </div>
            ) : null}
            {!loading && watchlistForm.open ? (
              <form
                className="space-y-3 rounded-2xl border border-dashed border-border/60 bg-white/70 p-4 shadow-sm"
                onSubmit={handleWatchlistSubmit}
              >
                <div className="space-y-1">
                  <label
                    htmlFor="watchlist-name"
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Name
                  </label>
                  <Input
                    id="watchlist-name"
                    placeholder="e.g. Tech momentum"
                    value={watchlistForm.name}
                    onChange={handleWatchlistNameChange}
                    disabled={watchlistForm.submitting}
                    autoFocus
                  />
                </div>
                {watchlistForm.error ? (
                  <p className="text-xs text-red-500">{watchlistForm.error}</p>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={watchlistForm.submitting}
                  >
                    {watchlistForm.submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleWatchlistForm}
                    disabled={watchlistForm.submitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : null}

            {loading ? (
              <div className="space-y-3">
                {[
                  "watch-skeleton-1",
                  "watch-skeleton-2",
                  "watch-skeleton-3",
                ].map((skeletonKey) => (
                  <div
                    key={skeletonKey}
                    className="skeleton h-[68px] rounded-2xl"
                  />
                ))}
              </div>
            ) : watchlists.length > 0 ? (
              <div className="space-y-3">
                {watchlists.map((watchlist) => {
                  const isActive = companyForm.watchlistId === watchlist.id;
                  const isSubmitting = companyForm.submitting && isActive;
                  const isDeleting = deletingWatchlistId === watchlist.id;
                  const isRenaming =
                    watchlistRename.watchlistId === watchlist.id;
                  const renameSubmitting =
                    watchlistRename.submitting && isRenaming;
                  return (
                    <div
                      key={watchlist.id}
                      className="space-y-4 rounded-2xl border border-border/60 bg-white/70 p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          {isRenaming ? (
                            <form
                              className="flex flex-col gap-2 sm:flex-row sm:items-center"
                              onSubmit={(event) =>
                                handleWatchlistRename(event, watchlist.id)
                              }
                            >
                              <Input
                                value={watchlistRename.name}
                                onChange={handleWatchlistRenameChange}
                                disabled={renameSubmitting}
                                autoFocus
                                className="sm:w-64"
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={renameSubmitting}
                                >
                                  {renameSubmitting ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    "Save"
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={cancelWatchlistRename}
                                  disabled={renameSubmitting}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          ) : (
                            <p className="font-medium text-foreground">
                              {watchlist.name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {watchlist.companies.length}{" "}
                            {watchlist.companies.length === 1
                              ? "entry"
                              : "entries"}
                          </p>
                          {isRenaming && watchlistRename.error ? (
                            <p className="text-xs text-red-500">
                              {watchlistRename.error}
                            </p>
                          ) : null}
                          {watchlist.companies.length > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-2">
                              {watchlist.companies.map((company) => {
                                const removalKey = `${watchlist.id}-${company.id}`;
                                const isRemovingSymbol =
                                  removingSymbols.has(removalKey);
                                return (
                                  <span
                                    key={removalKey}
                                    className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-white/80 px-3 py-1 text-xs shadow-sm"
                                  >
                                    <span className="font-semibold text-foreground">
                                      {company.symbol}
                                    </span>
                                    {company.name &&
                                    company.name !== company.symbol ? (
                                      <span className="text-muted-foreground">
                                        {company.name}
                                      </span>
                                    ) : null}
                                    {company.industry ===
                                    "Exchange Traded Fund" ? (
                                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                                        ETF
                                      </span>
                                    ) : null}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveCompany(
                                          watchlist.id,
                                          company.id,
                                          company.symbol,
                                        )
                                      }
                                      disabled={isRemovingSymbol}
                                      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-transparent text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                                    >
                                      {isRemovingSymbol ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <X
                                          className="h-3 w-3"
                                          aria-hidden="true"
                                        />
                                      )}
                                      <span className="sr-only">
                                        Remove {company.symbol} from watchlist
                                      </span>
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="mt-3 rounded-xl border border-dashed border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                              No symbols added yet
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 sm:flex-row sm:items-center sm:justify-end">
                          {!isRenaming ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => startWatchlistRename(watchlist)}
                              disabled={isDeleting}
                            >
                              Rename
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleCompanyForm(watchlist.id)}
                            disabled={
                              isSubmitting || isDeleting || renameSubmitting
                            }
                          >
                            {isActive ? "Close form" : "Add symbol"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteWatchlist(watchlist.id)}
                            disabled={isDeleting || renameSubmitting}
                          >
                            {isDeleting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              "Delete"
                            )}
                          </Button>
                        </div>
                      </div>
                      {isActive ? (
                        <form
                          className="space-y-3 rounded-2xl border border-dashed border-border/60 bg-white/60 p-4"
                          onSubmit={(event) =>
                            handleAddCompany(event, watchlist.id)
                          }
                        >
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <label
                                htmlFor={`watchlist-symbol-${watchlist.id}`}
                                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                              >
                                Symbol / ISIN
                              </label>
                              <Input
                                id={`watchlist-symbol-${watchlist.id}`}
                                placeholder="e.g. SPY or US0378331005"
                                value={isActive ? companyForm.symbol : ""}
                                onChange={handleCompanySymbolChange}
                                disabled={companyForm.submitting || isDeleting}
                                autoFocus
                              />
                            </div>
                            <div className="space-y-1">
                              <label
                                htmlFor={`watchlist-label-${watchlist.id}`}
                                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                              >
                                Display name (optional)
                              </label>
                              <Input
                                id={`watchlist-label-${watchlist.id}`}
                                placeholder="e.g. S&P 500 ETF"
                                value={isActive ? companyForm.label : ""}
                                onChange={handleCompanyLabelChange}
                                disabled={companyForm.submitting || isDeleting}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label
                              htmlFor={`watchlist-category-${watchlist.id}`}
                              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                            >
                              Instrument
                            </label>
                            <select
                              id={`watchlist-category-${watchlist.id}`}
                              value={companyForm.category}
                              onChange={handleCompanyCategoryChange}
                              disabled={companyForm.submitting || isDeleting}
                              className="h-9 w-full rounded-lg border border-border/60 bg-white px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                            >
                              <option value="equity">Stock</option>
                              <option value="etf">ETF</option>
                            </select>
                          </div>
                          {companyForm.error ? (
                            <p className="text-xs text-red-500">
                              {companyForm.error}
                            </p>
                          ) : null}
                          {companyForm.message ? (
                            <p className="text-xs text-emerald-600">
                              {companyForm.message}
                            </p>
                          ) : null}
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Button
                              type="submit"
                              size="sm"
                              disabled={companyForm.submitting || isDeleting}
                            >
                              {companyForm.submitting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Adding...
                                </>
                              ) : (
                                "Add symbol"
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={closeCompanyForm}
                              disabled={companyForm.submitting || isDeleting}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-border/50 bg-muted/40 py-8 text-center text-sm text-muted-foreground">
                No watchlists created yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel rounded-3xl border-none shadow-lg">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-3 text-lg">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                  <Layers className="h-4 w-4" />
                </span>
                <span className="inline-flex items-center gap-2">
                  Portfolios
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                      >
                        <Info className="h-3.5 w-3.5" />
                        <span className="sr-only">What are portfolios?</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-left">
                      Model allocation ideas, run optimiser scenarios and keep a
                      record of your current holdings mix without affecting your
                      brokerage account.
                    </TooltipContent>
                  </Tooltip>
                </span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Combine holdings and run optimisation scenarios.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={togglePortfolioForm}
              disabled={portfolioForm.submitting || loading}
            >
              {portfolioForm.open ? "Close" : "Create New"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {!loading && portfolioForm.open ? (
              <form
                className="space-y-3 rounded-2xl border border-dashed border-border/60 bg-white/70 p-4 shadow-sm"
                onSubmit={handlePortfolioSubmit}
              >
                <div className="space-y-1">
                  <label
                    htmlFor="portfolio-name"
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Name
                  </label>
                  <Input
                    id="portfolio-name"
                    placeholder="e.g. Global growth"
                    value={portfolioForm.name}
                    onChange={handlePortfolioNameChange}
                    disabled={portfolioForm.submitting}
                    autoFocus
                  />
                </div>
                {portfolioForm.error ? (
                  <p className="text-xs text-red-500">{portfolioForm.error}</p>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={portfolioForm.submitting}
                  >
                    {portfolioForm.submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={togglePortfolioForm}
                    disabled={portfolioForm.submitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : null}

            {loading ? (
              <div className="space-y-3">
                {[
                  "portfolio-skeleton-1",
                  "portfolio-skeleton-2",
                  "portfolio-skeleton-3",
                ].map((skeletonKey) => (
                  <div
                    key={skeletonKey}
                    className="skeleton h-[68px] rounded-2xl"
                  />
                ))}
              </div>
            ) : portfolios.length > 0 ? (
              <div className="space-y-3">
                {portfolios.map((portfolio) => {
                  const isEditing = portfolioEditingId === portfolio.id;
                  const isOptimising = optimisingPortfolioId === portfolio.id;
                  const feedback =
                    portfolioFeedback.portfolioId === portfolio.id
                      ? portfolioFeedback
                      : null;
                  const statsState = portfolioStats[portfolio.id];
                  const stats = statsState?.data ?? null;
                  const statsLoading = statsState?.loading ?? false;
                  const statsError = statsState?.error ?? null;

                  return (
                    <div
                      key={portfolio.id}
                      className="space-y-4 rounded-2xl border border-border/60 bg-white/70 p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {portfolio.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {portfolio.holdings.length}{" "}
                            {portfolio.holdings.length === 1
                              ? "holding"
                              : "holdings"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => togglePortfolioEditor(portfolio.id)}
                          >
                            {isEditing ? "Close editor" : "Edit holdings"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleEqualWeightOptimise(portfolio.id)
                            }
                            disabled={isOptimising}
                          >
                            {isOptimising ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Optimising...
                              </>
                            ) : (
                              "Equal weight"
                            )}
                          </Button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-4 rounded-2xl border border-dashed border-border/60 bg-white/60 p-4">
                          <p className="text-xs text-muted-foreground">
                            Enter weights as decimals that sum to 1.0. Adjust
                            existing entries or add new tickers below.
                          </p>
                          {feedback?.message ? (
                            <div
                              className={`rounded-xl px-3 py-2 text-xs ${
                                feedback.type === "success"
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border border-red-200 bg-red-50 text-red-600"
                              }`}
                            >
                              {feedback.message}
                            </div>
                          ) : null}

                          <div className="rounded-2xl border border-border/40 bg-white/80 p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-sm font-semibold text-foreground">
                                Portfolio analytics
                              </p>
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                                  >
                                    <Info className="h-3.5 w-3.5" />
                                    <span className="sr-only">
                                      Portfolio analytics help
                                    </span>
                                  </button>
                                </HoverCardTrigger>
                                <HoverCardContent className="max-w-sm text-xs text-muted-foreground">
                                  <p className="text-sm font-semibold text-foreground">
                                    Daily metrics from price history
                                  </p>
                                  <p className="mt-2">
                                    Returns, volatility, and Sharpe ratio rely
                                    on the latest 120 trading days for each
                                    holding. We normalise weights before
                                    combining results and assume a zero
                                    risk-free rate.
                                  </p>
                                </HoverCardContent>
                              </HoverCard>
                            </div>
                            {statsLoading ? (
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {[
                                  "portfolio-stats-skeleton-1",
                                  "portfolio-stats-skeleton-2",
                                  "portfolio-stats-skeleton-3",
                                  "portfolio-stats-skeleton-4",
                                ].map((key) => (
                                  <div
                                    key={key}
                                    className="skeleton h-12 rounded-xl"
                                  />
                                ))}
                              </div>
                            ) : statsError ? (
                              <p className="mt-3 text-xs text-red-500">
                                {statsError}
                              </p>
                            ) : stats ? (
                              <>
                                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                                  <div className="rounded-xl border border-border/40 bg-white px-3 py-2">
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      Weight sum
                                    </dt>
                                    <dd className="text-sm font-semibold text-foreground">
                                      {Number.isFinite(stats.weightSum)
                                        ? stats.weightSum.toFixed(2)
                                        : "0.00"}
                                    </dd>
                                  </div>
                                  <div className="rounded-xl border border-border/40 bg-white px-3 py-2">
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      Weighted price
                                    </dt>
                                    <dd className="text-sm font-semibold text-foreground">
                                      {Number.isFinite(stats.totalValue)
                                        ? stats.totalValue.toFixed(2)
                                        : "0.00"}
                                    </dd>
                                  </div>
                                  <div className="rounded-xl border border-border/40 bg-white px-3 py-2">
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      Avg daily return
                                    </dt>
                                    <dd className="text-sm font-semibold text-foreground">
                                      {formatPercentage(stats.expectedReturn)}
                                    </dd>
                                  </div>
                                  <div className="rounded-xl border border-border/40 bg-white px-3 py-2">
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      Daily volatility
                                    </dt>
                                    <dd className="text-sm font-semibold text-foreground">
                                      {formatPercentage(stats.volatility)}
                                    </dd>
                                  </div>
                                  <div className="rounded-xl border border-border/40 bg-white px-3 py-2">
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      Sharpe ratio
                                    </dt>
                                    <dd className="text-sm font-semibold text-foreground">
                                      {Number.isFinite(stats.sharpeRatio)
                                        ? stats.sharpeRatio.toFixed(2)
                                        : "0.00"}
                                    </dd>
                                  </div>
                                  <div className="rounded-xl border border-border/40 bg-white px-3 py-2">
                                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      Observations
                                    </dt>
                                    <dd className="text-sm font-semibold text-foreground">
                                      {stats.observationCount}
                                    </dd>
                                  </div>
                                </dl>
                                {Object.keys(stats.meanReturns).length > 0 ? (
                                  <div className="mt-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      Avg daily return by symbol
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {Object.entries(stats.meanReturns).map(
                                        ([symbol, value]) => (
                                          <span
                                            key={symbol}
                                            className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-white/70 px-3 py-1 text-xs"
                                          >
                                            <span className="font-semibold text-foreground">
                                              {symbol}
                                            </span>
                                            <span className="text-muted-foreground">
                                              {formatPercentage(value)}
                                            </span>
                                          </span>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                ) : null}
                              </>
                            ) : (
                              <p className="mt-3 text-xs text-muted-foreground">
                                Analytics will appear once holdings include
                                sufficient price history.
                              </p>
                            )}
                          </div>

                          {portfolio.holdings.length > 0 ? (
                            <div className="space-y-3">
                              {portfolio.holdings.map((holding) => {
                                const edit = holdingEdits[holding.id] ?? {
                                  value: formatWeightValue(holding.weight),
                                  submitting: false,
                                  error: null,
                                };
                                const parsedValue = Number.parseFloat(
                                  edit.value,
                                );
                                const dirty =
                                  Number.isFinite(parsedValue) &&
                                  Math.abs(parsedValue - holding.weight) >
                                    0.0001;
                                const isDeleting = deletingHoldingIds.has(
                                  holding.id,
                                );
                                const weightInputId = `holding-weight-${holding.id}`;

                                return (
                                  <div
                                    key={holding.id}
                                    className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div>
                                      <p className="text-sm font-semibold text-foreground">
                                        {holding.company.symbol}
                                      </p>
                                      {holding.company.name ? (
                                        <p className="text-xs text-muted-foreground">
                                          {holding.company.name}
                                        </p>
                                      ) : null}
                                    </div>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                                      <div className="flex flex-col">
                                        <label
                                          htmlFor={weightInputId}
                                          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                        >
                                          Weight
                                        </label>
                                        <Input
                                          id={weightInputId}
                                          inputMode="decimal"
                                          name="weight"
                                          value={edit.value}
                                          onChange={(event) =>
                                            handleHoldingWeightChange(
                                              holding.id,
                                              event.target.value,
                                            )
                                          }
                                          disabled={
                                            edit.submitting || isDeleting
                                          }
                                          className="mt-1 w-28"
                                        />
                                        {edit.error ? (
                                          <span className="mt-1 text-xs text-red-500">
                                            {edit.error}
                                          </span>
                                        ) : null}
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          onClick={() =>
                                            handleUpdateHoldingWeight(
                                              holding.id,
                                              portfolio.id,
                                            )
                                          }
                                          disabled={
                                            edit.submitting ||
                                            isDeleting ||
                                            !dirty
                                          }
                                        >
                                          {edit.submitting ? (
                                            <>
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                              Saving...
                                            </>
                                          ) : (
                                            "Save"
                                          )}
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            handleDeleteHolding(
                                              holding.id,
                                              portfolio.id,
                                            )
                                          }
                                          disabled={
                                            isDeleting || edit.submitting
                                          }
                                        >
                                          {isDeleting ? (
                                            <>
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                              Removing...
                                            </>
                                          ) : (
                                            "Remove"
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="rounded-xl border border-dashed border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                              No holdings added yet.
                            </p>
                          )}

                          <form
                            className="space-y-3 rounded-2xl border border-border/40 bg-white/80 p-4"
                            onSubmit={(event) =>
                              handleAddHolding(event, portfolio.id)
                            }
                          >
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <label
                                    htmlFor={`holding-symbol-${portfolio.id}`}
                                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                  >
                                    Symbol
                                  </label>
                                  <Input
                                    id={`holding-symbol-${portfolio.id}`}
                                    name="symbol"
                                    placeholder="e.g. AAPL"
                                    value={
                                      holdingForm.portfolioId === portfolio.id
                                        ? holdingForm.symbol
                                        : ""
                                    }
                                    onChange={handleHoldingFormInputChange}
                                    disabled={
                                      holdingForm.submitting ||
                                      holdingForm.portfolioId !== portfolio.id
                                    }
                                    autoFocus={portfolio.holdings.length === 0}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label
                                    htmlFor={`holding-isin-${portfolio.id}`}
                                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                  >
                                    ISIN (optional)
                                  </label>
                                  <Input
                                    id={`holding-isin-${portfolio.id}`}
                                    name="isin"
                                    placeholder="e.g. US0378331005"
                                    value={
                                      holdingForm.portfolioId === portfolio.id
                                        ? holdingForm.isin
                                        : ""
                                    }
                                    onChange={handleHoldingFormInputChange}
                                    disabled={
                                      holdingForm.submitting ||
                                      holdingForm.portfolioId !== portfolio.id
                                    }
                                  />
                                  <p className="text-[10px] text-muted-foreground">
                                    2 letters + 9 alphanumeric + 1 digit
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <label
                                    htmlFor={`holding-weight-${portfolio.id}`}
                                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                  >
                                    Weight
                                  </label>
                                  <Input
                                    id={`holding-weight-${portfolio.id}`}
                                    name="weight"
                                    placeholder="e.g. 0.25"
                                    inputMode="decimal"
                                    value={
                                      holdingForm.portfolioId === portfolio.id
                                        ? holdingForm.weight
                                        : ""
                                    }
                                    onChange={handleHoldingFormInputChange}
                                    disabled={
                                      holdingForm.submitting ||
                                      holdingForm.portfolioId !== portfolio.id
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label
                                    htmlFor={`holding-label-${portfolio.id}`}
                                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                  >
                                    Display name (optional)
                                  </label>
                                  <Input
                                    id={`holding-label-${portfolio.id}`}
                                    name="label"
                                    placeholder="e.g. Apple Inc."
                                    value={
                                      holdingForm.portfolioId === portfolio.id
                                        ? holdingForm.label
                                        : ""
                                    }
                                    onChange={handleHoldingFormInputChange}
                                    disabled={
                                      holdingForm.submitting ||
                                      holdingForm.portfolioId !== portfolio.id
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                            {holdingForm.portfolioId === portfolio.id &&
                            holdingForm.error ? (
                              <p className="text-xs text-red-500">
                                {holdingForm.error}
                              </p>
                            ) : null}
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Button
                                type="submit"
                                size="sm"
                                disabled={
                                  holdingForm.submitting ||
                                  holdingForm.portfolioId !== portfolio.id
                                }
                              >
                                {holdingForm.submitting &&
                                holdingForm.portfolioId === portfolio.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Adding...
                                  </>
                                ) : (
                                  "Add holding"
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  resetHoldingFormState(portfolio.id)
                                }
                                disabled={holdingForm.submitting}
                              >
                                Clear
                              </Button>
                            </div>
                          </form>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-border/50 bg-muted/40 py-8 text-center text-sm text-muted-foreground">
                No portfolios created yet
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="glass-panel rounded-3xl border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-lg">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <Palette className="h-4 w-4" />
            </span>
            Notifications
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Stay proactive with inbox updates and price-based triggers.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-2 rounded-2xl border border-border/60 bg-white/70 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">
                  <span className="inline-flex items-center gap-2">
                    Email notifications
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                        >
                          <Info className="h-3.5 w-3.5" />
                          <span className="sr-only">
                            Why enable email notifications?
                          </span>
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent className="space-y-2 text-left text-xs text-muted-foreground">
                        <p className="text-sm font-medium text-foreground">
                          What you will receive
                        </p>
                        <ul className="space-y-1">
                          <li>
                            • Sentiment shifts for symbols in your watchlists.
                          </li>
                          <li>
                            • Breaking headlines that pass our relevance filter.
                          </li>
                          <li>• Price alerts that cross saved thresholds.</li>
                        </ul>
                        <p>
                          We only email when one of these events occurs and you
                          can toggle it off anytime.
                        </p>
                      </HoverCardContent>
                    </HoverCard>
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Receive sentiment changes, breaking news, and price alerts in
                  your inbox.
                </p>
              </div>
              {notificationPreference ? (
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border/60 text-accent focus:ring-accent"
                    checked={notificationPreference.emailEnabled}
                    onChange={handleEmailPreferenceToggle}
                    disabled={emailPrefUpdating}
                  />
                  <span>
                    {notificationPreference.emailEnabled
                      ? "Enabled"
                      : "Disabled"}
                  </span>
                </label>
              ) : (
                <div className="h-5 w-24 animate-pulse rounded-full bg-muted/60" />
              )}
            </div>
            {emailPrefError ? (
              <p className="text-xs text-red-500">{emailPrefError}</p>
            ) : null}
          </section>

          <section className="space-y-4 rounded-2xl border border-border/60 bg-white/70 p-4 shadow-sm">
            <div>
              <p className="font-medium text-foreground">
                <span className="inline-flex items-center gap-2">
                  Price alerts
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                      >
                        <Info className="h-3.5 w-3.5" />
                        <span className="sr-only">
                          How do price alerts work?
                        </span>
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent className="space-y-2 text-left text-xs text-muted-foreground">
                      <p className="text-sm font-medium text-foreground">
                        Powered by the nightly refresh
                      </p>
                      <p>
                        We check your thresholds each time fresh prices are
                        pulled in. When a symbol trades above/below the level
                        you set, we send an email (if enabled) and log the
                        trigger time.
                      </p>
                      <p>
                        Tip: Create separate alerts for upside targets and
                        downside stops so you know exactly when to review a
                        position.
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Be notified when a symbol trades above or below your chosen
                threshold.
              </p>
            </div>
            <form className="space-y-3" onSubmit={handlePriceAlertSubmit}>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <label
                    htmlFor="price-alert-symbol"
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Symbol
                  </label>
                  <Input
                    id="price-alert-symbol"
                    name="symbol"
                    placeholder="e.g. AAPL"
                    value={priceAlertForm.symbol}
                    onChange={handlePriceAlertInputChange}
                    disabled={priceAlertForm.submitting}
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="price-alert-threshold"
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Threshold ($)
                  </label>
                  <Input
                    id="price-alert-threshold"
                    name="threshold"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 150"
                    value={priceAlertForm.threshold}
                    onChange={handlePriceAlertInputChange}
                    disabled={priceAlertForm.submitting}
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="price-alert-direction"
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Trigger
                  </label>
                  <select
                    id="price-alert-direction"
                    value={priceAlertForm.direction}
                    onChange={handlePriceAlertDirectionChange}
                    disabled={priceAlertForm.submitting}
                    className="h-9 w-full rounded-lg border border-border/60 bg-white px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    <option value="above">Above threshold</option>
                    <option value="below">Below threshold</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="price-alert-label"
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    Label (optional)
                  </label>
                  <Input
                    id="price-alert-label"
                    name="label"
                    placeholder="e.g. Long-term target"
                    value={priceAlertForm.label}
                    onChange={handlePriceAlertInputChange}
                    disabled={priceAlertForm.submitting}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  size="sm"
                  disabled={priceAlertForm.submitting}
                >
                  {priceAlertForm.submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save alert"
                  )}
                </Button>
                {priceAlertMessage ? (
                  <span className="text-xs text-emerald-600">
                    {priceAlertMessage}
                  </span>
                ) : null}
              </div>
              {priceAlertError ? (
                <p className="text-xs text-red-500">{priceAlertError}</p>
              ) : null}
            </form>

            {priceAlerts.length > 0 ? (
              <div className="space-y-3">
                {priceAlerts.map((alert) => {
                  const isDeleting = priceAlertDeletingId === alert.id;
                  return (
                    <div
                      key={alert.id}
                      className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <span>{alert.symbol}</span>
                          <span className="text-muted-foreground">
                            {alert.companyName}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Notify when price{" "}
                          {alert.direction === "above" ? "≥" : "≤"} $
                          {alert.threshold.toFixed(2)}
                        </p>
                        {alert.lastTriggered ? (
                          <p className="text-xs text-muted-foreground">
                            Last triggered{" "}
                            {new Date(alert.lastTriggered).toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePriceAlert(alert.id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Removing...
                          </>
                        ) : (
                          "Remove"
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-border/40 bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
                No price alerts created yet
              </p>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
