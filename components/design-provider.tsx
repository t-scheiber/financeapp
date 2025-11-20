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

type ThemeOption = "light" | "dark" | "system";
type AccentOption = "azure" | "emerald" | "violet" | "amber";
type RadiusOption = "soft" | "default" | "rounded";
type MotionOption = "balanced" | "minimal";

export interface DesignSettings {
  theme: ThemeOption;
  accent: AccentOption;
  radius: RadiusOption;
  motion: MotionOption;
}

const DEFAULT_SETTINGS: DesignSettings = {
  theme: "system",
  accent: "azure",
  radius: "default",
  motion: "balanced",
};

const STORAGE_KEY = "financeapp-design-preferences";

interface DesignSettingsContextValue {
  settings: DesignSettings;
  isReady: boolean;
  updateSetting: <Key extends keyof DesignSettings>(
    key: Key,
    value: DesignSettings[Key],
  ) => void;
  reset: () => void;
}

const DesignSettingsContext = createContext<DesignSettingsContextValue | null>(
  null,
);

function getStoredSettings(): DesignSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DesignSettings>;
    return {
      theme: parsed.theme ?? DEFAULT_SETTINGS.theme,
      accent: parsed.accent ?? DEFAULT_SETTINGS.accent,
      radius: parsed.radius ?? DEFAULT_SETTINGS.radius,
      motion: parsed.motion ?? DEFAULT_SETTINGS.motion,
    };
  } catch {
    return null;
  }
}

function applyDesignSettings(settings: DesignSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // Theme
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldUseDark =
    settings.theme === "dark" ||
    (settings.theme === "system" && prefersDark === true);
  root.classList.toggle("dark", shouldUseDark);
  root.setAttribute("data-theme", settings.theme);

  // Accent, radius, motion
  root.setAttribute("data-accent", settings.accent);
  root.setAttribute("data-radius", settings.radius);
  root.setAttribute("data-motion", settings.motion);
}

export function DesignProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DesignSettings>(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = getStoredSettings();
    if (stored) {
      setSettings(stored);
      applyDesignSettings(stored);
    } else {
      applyDesignSettings(DEFAULT_SETTINGS);
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore write errors (e.g. private mode).
    }
    applyDesignSettings(settings);
  }, [settings, isReady]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (settings.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyDesignSettings(settings);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handler);
    } else {
      media.addListener(handler);
    }
    return () => {
      if (typeof media.removeEventListener === "function") {
        media.removeEventListener("change", handler);
      } else {
        media.removeListener(handler);
      }
    };
  }, [settings]);

  const updateSetting = useCallback<
    DesignSettingsContextValue["updateSetting"]
  >((key, value) => {
    setSettings((prev) => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo<DesignSettingsContextValue>(
    () => ({
      settings,
      isReady,
      updateSetting,
      reset,
    }),
    [settings, isReady, updateSetting, reset],
  );

  return (
    <DesignSettingsContext.Provider value={value}>
      {children}
    </DesignSettingsContext.Provider>
  );
}

export function useDesignSettings() {
  const ctx = useContext(DesignSettingsContext);
  if (!ctx) {
    throw new Error(
      "useDesignSettings must be used within a DesignProvider component.",
    );
  }
  return ctx;
}

export const designOptions = {
  theme: [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ] satisfies { value: ThemeOption; label: string }[],
  accent: [
    { value: "azure", label: "Azure" },
    { value: "emerald", label: "Emerald" },
    { value: "violet", label: "Violet" },
    { value: "amber", label: "Amber" },
  ] satisfies { value: AccentOption; label: string }[],
  radius: [
    { value: "soft", label: "Soft" },
    { value: "default", label: "Default" },
    { value: "rounded", label: "Rounded" },
  ] satisfies { value: RadiusOption; label: string }[],
  motion: [
    { value: "balanced", label: "Balanced" },
    { value: "minimal", label: "Minimal" },
  ] satisfies { value: MotionOption; label: string }[],
};
