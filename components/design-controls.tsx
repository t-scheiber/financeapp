"use client";

import { clsx } from "clsx";
import {
  Circle,
  Droplets,
  GitBranch,
  MonitorCog,
  Moon,
  Palette,
  Settings2,
  Sparkles,
  Square,
  Sun,
  Waves,
} from "lucide-react";
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type DesignSettings,
  designOptions,
  useDesignSettings,
} from "@/components/design-provider";
import { Button } from "@/components/ui/button";

const themeIconMap: Record<string, ReactNode> = {
  light: <Sun className="h-4 w-4" />,
  dark: <Moon className="h-4 w-4" />,
  system: <MonitorCog className="h-4 w-4" />,
};

const radiusIconMap: Record<string, ReactNode> = {
  soft: <Square className="h-4 w-4 rounded-[20%]" />,
  default: <Square className="h-4 w-4 rounded-md" />,
  rounded: <Circle className="h-4 w-4" />,
};

const motionIconMap: Record<string, ReactNode> = {
  balanced: <Sparkles className="h-4 w-4" />,
  minimal: <Waves className="h-4 w-4" />,
};

export function DesignControlsTrigger({ className }: { className?: string }) {
  const panelId = "design-controls-panel";
  const { settings } = useDesignSettings();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    }
    function handleClick(event: MouseEvent) {
      if (
        panelRef.current &&
        event.target instanceof Node &&
        !panelRef.current.contains(event.target)
      ) {
        close();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("mousedown", handleClick);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("mousedown", handleClick);
    };
  }, [open, close]);

  return (
    <div className={clsx("relative z-40", className)}>
      <Button
        variant="ghost"
        size="icon"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-pressed={open}
        aria-controls={panelId}
        title="Adjust appearance settings"
        data-state={open ? "open" : "closed"}
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          "relative h-10 w-10 rounded-full border border-border/60 text-foreground shadow-sm backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
          "bg-card/80 hover:border-accent/60 hover:bg-accent/10 hover:text-accent dark:bg-card/60 dark:hover:bg-accent/20",
          open && "border-accent/70 bg-accent/15 text-accent shadow-accent/20",
        )}
      >
        <Palette className="h-4 w-4" />
        <span className="sr-only">Toggle design controls</span>
      </Button>

      <div
        id={panelId}
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-label="Design customization"
        className={clsx(
          "glass-panel absolute right-0 z-50 mt-4 w-[min(360px,86vw)] origin-top-right rounded-2xl bg-card/95 p-5 shadow-lg backdrop-blur-xl transition-all duration-200 dark:bg-card/90",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Personalise experience
            </p>
            <p className="text-xs text-muted-foreground">
              Tweaks are saved to this device
            </p>
          </div>
          <Settings2 className="h-4 w-4 text-muted-foreground" />
        </header>
        <DesignSettingsForm
          className="space-y-4"
          summary={settings}
          onChange={() => undefined}
        />
        <footer className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <GitBranch className="h-3.5 w-3.5" />
            <span>Live preview updates instantly</span>
          </div>
          <button
            type="button"
            onClick={close}
            className="font-medium text-accent-foreground hover:underline"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

interface DesignSettingsFormProps extends ComponentProps<"div"> {
  summary?: DesignSettings;
  showReset?: boolean;
}

export function DesignSettingsForm({
  className,
  summary,
  showReset = true,
  ...props
}: DesignSettingsFormProps) {
  const { settings, updateSetting, reset, isReady } = useDesignSettings();
  const current = summary ?? settings;

  const handleSelect = useCallback(
    <Key extends keyof DesignSettings>(key: Key, value: DesignSettings[Key]) =>
      () =>
        updateSetting(key, value),
    [updateSetting],
  );

  const layout = useMemo(
    () => [
      {
        title: "Theme",
        description: "Choose light, dark or follow your system preference.",
        key: "theme" as const,
        options: designOptions.theme,
        iconMap: themeIconMap,
      },
      {
        title: "Accent",
        description: "Swap highlight colours for charts and buttons.",
        key: "accent" as const,
        options: designOptions.accent,
        iconMap: {
          azure: <Droplets className="h-4 w-4" />,
          emerald: <Droplets className="h-4 w-4" />,
          violet: <Droplets className="h-4 w-4" />,
          amber: <Droplets className="h-4 w-4" />,
        },
      },
      {
        title: "Corners",
        description: "Adjust how rounded surfaces feel across the app.",
        key: "radius" as const,
        options: designOptions.radius,
        iconMap: radiusIconMap,
      },
      {
        title: "Motion",
        description: "Balance delight with focus using subtle animations.",
        key: "motion" as const,
        options: designOptions.motion,
        iconMap: motionIconMap,
      },
    ],
    [],
  );

  return (
    <div className={clsx("flex flex-col gap-5", className)} {...props}>
      {layout.map(({ title, description, key, options, iconMap }) => (
        <section key={key} className="space-y-2">
          <header className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </header>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => {
              const isActive = current[key] === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={handleSelect(key, option.value)}
                  aria-pressed={isActive}
                  className={clsx(
                    "group flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all",
                    "border-border/60 bg-card/60 text-muted-foreground backdrop-blur dark:bg-card/40",
                    "hover:border-accent/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
                    isActive &&
                      "border-accent/70 bg-accent/12 text-foreground shadow-[0_0_0_1px] shadow-accent/20",
                  )}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent">
                    {iconMap?.[option.value as keyof typeof iconMap] ?? (
                      <Palette className="h-4 w-4" />
                    )}
                  </span>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {showReset ? (
        <div className="flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
          <span>
            {isReady ? "Preferences saved locally." : "Loading preferences..."}
          </span>
          <button
            type="button"
            onClick={reset}
            className="font-medium text-accent-foreground hover:underline"
          >
            Reset
          </button>
        </div>
      ) : null}
    </div>
  );
}
