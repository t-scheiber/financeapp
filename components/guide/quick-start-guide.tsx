"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { QuickStartGuideStep } from "@/lib/constants/guide";

interface QuickStartGuideProps {
  open: boolean;
  steps: QuickStartGuideStep[];
  onOpenChange: (next: boolean) => void;
  onFinish?: () => void;
  onSkip?: () => void;
  busy?: boolean;
  title?: string;
}

export function QuickStartGuideDialog({
  open,
  steps,
  onOpenChange,
  onFinish,
  onSkip,
  busy = false,
  title = "Quick Start Tour",
}: QuickStartGuideProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setStepIndex(0);
    }
  }, [open]);

  const totalSteps = steps.length;
  const currentStep = steps[stepIndex] ?? steps[0];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;
  const progressPercent = useMemo(() => {
    if (totalSteps === 0) return 0;
    return Math.round(((stepIndex + 1) / totalSteps) * 100);
  }, [stepIndex, totalSteps]);

  if (!hasMounted || !open || totalSteps === 0) {
    return null;
  }

  const handleClose = () => {
    if (busy) return;
    onOpenChange(false);
    onSkip?.();
  };

  const handleBack = () => {
    if (busy) return;
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    if (busy) return;
    if (isLastStep) {
      onFinish?.();
      return;
    }
    setStepIndex((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      aria-modal="true"
      role="dialog"
      aria-label="Quick start tour"
    >
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl border border-accent/20 bg-card/95 p-6 text-left shadow-2xl dark:bg-card/90 max-h-[85vh] overflow-y-auto">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full border border-border/50 bg-background/80 p-1.5 text-muted-foreground shadow-sm transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          aria-label="Close tour"
          disabled={busy}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-4 text-xs font-medium uppercase text-muted-foreground">
              <span>{title}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5">
                Step {stepIndex + 1} of {totalSteps}
              </span>
            </div>

            <div className="h-1.5 w-full rounded-full bg-border/80">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${progressPercent}%` }}
                aria-label={`Progress ${progressPercent}%`}
              />
            </div>

            <div className="space-y-2">
              {currentStep.badge ? (
                <Badge variant="secondary" className="uppercase tracking-wide">
                  {currentStep.badge}
                </Badge>
              ) : null}
              <h3 className="text-2xl font-semibold text-foreground">
                {currentStep.title}
              </h3>
              <p className="text-base text-muted-foreground">
                {currentStep.description}
              </p>
            </div>

            {currentStep.highlights?.length ? (
              <ul className="mt-4 space-y-2 rounded-2xl border border-border/50 bg-background/70 p-4 text-sm text-foreground">
                {currentStep.highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="flex items-start gap-2 text-muted-foreground"
                  >
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {currentStep.cta ? (
              <Button
                asChild
                variant="secondary"
                className="mt-4 w-full justify-center sm:w-auto"
              >
                {currentStep.cta.external ? (
                  <a
                    href={currentStep.cta.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {currentStep.cta.label}
                  </a>
                ) : (
                  <Link href={currentStep.cta.href}>{currentStep.cta.label}</Link>
                )}
              </Button>
            ) : null}
          </div>

          <div className="flex w-full max-w-[240px] flex-col rounded-2xl border border-border/40 bg-muted/50 p-4 text-sm text-muted-foreground sm:self-stretch">
            <p className="text-xs font-semibold uppercase text-foreground/70">
              Up next
            </p>
            <div className="mt-3 space-y-2">
              {steps.slice(stepIndex + 1, stepIndex + 3).map((step) => (
                <div
                  key={step.id}
                  className="rounded-xl border border-border/30 bg-background/60 p-3"
                >
                  <p className="text-xs uppercase tracking-wide text-foreground/60">
                    {step.badge}
                  </p>
                  <p className="text-foreground">{step.title}</p>
                </div>
              ))}
              {stepIndex + 1 >= totalSteps ? (
                <div className="rounded-xl border border-border/30 bg-background/60 p-3 text-center text-foreground">
                  You’re on the final step 🎉
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={busy}
            className="text-muted-foreground hover:text-foreground"
          >
            Skip tour
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={busy || isFirstStep}
            >
              <ChevronLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleNext} disabled={busy}>
              {isLastStep ? (
                <>
                  {busy ? "Saving..." : "Finish tour"}
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </>
              ) : (
                <>
                  Next step
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


