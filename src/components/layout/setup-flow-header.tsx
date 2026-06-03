"use client";

import { type ReactNode } from "react";

import { AppBackButton } from "@/components/ui/app-back-button";
import { cn } from "@/lib/utils";

type SetupFlowHeaderProps = {
  currentStep?: number;
  totalSteps?: number;
  title: string;
  sublabel?: string;
  backHref?: string;
  onBack?: () => void;
  backLabel?: string;
  /** When false, only back + title block (e.g. waiting room). Default true. */
  showProgress?: boolean;
  /** Page title color — default pink; use ink (black) on start page only */
  titleTone?: "pink" | "ink";
  /** Top-right action (e.g. guide menu on session page). */
  trailingAction?: ReactNode;
  /** Tighter top spacing for post-hangout flows (reveal, guessing, gallery). */
  compact?: boolean;
  className?: string;
};

export function SetupFlowHeader({
  currentStep = 1,
  totalSteps = 1,
  title,
  sublabel,
  backHref,
  onBack,
  backLabel,
  showProgress = true,
  titleTone = "pink",
  trailingAction,
  compact = false,
  className,
}: SetupFlowHeaderProps) {
  const progress = Math.min(100, Math.max(0, (currentStep / totalSteps) * 100));
  const mobileTitleMargin = compact
    ? showProgress
      ? "mt-10 sm:mt-11"
      : "mt-4 sm:mt-5"
    : showProgress
      ? "mt-12 sm:mt-14"
      : "mt-8 sm:mt-10";

  return (
    <header
      className={cn(
        "md:flex md:flex-col",
        compact ? "md:gap-5" : "md:gap-8",
        className,
      )}
    >
      {/* Mobile: centered toolbar with absolute back */}
      <div className="relative flex items-start justify-center md:hidden">
        <div className="absolute left-0 top-0">
          {backHref || onBack ? (
            <AppBackButton backHref={backHref} onBack={onBack} backLabel={backLabel} />
          ) : (
            <div className="h-9 w-9" aria-hidden />
          )}
        </div>

        <div className="absolute right-0 top-0">
          {trailingAction ?? <div className="h-9 w-9" aria-hidden />}
        </div>

        {showProgress ? (
          <div className="flex flex-col items-center gap-2.5 px-12">
            <p className="text-xs font-medium tabular-nums text-muted">
              {currentStep} / {totalSteps}
            </p>
            <div
              className="relative h-1.5 w-28 overflow-hidden rounded-full bg-black/10 sm:w-32"
              role="progressbar"
              aria-valuenow={currentStep}
              aria-valuemin={1}
              aria-valuemax={totalSteps}
              aria-label={`Step ${currentStep} of ${totalSteps}`}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-pink-highlight transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Desktop left panel: back → progress → title */}
      <div className="hidden md:flex md:flex-col md:gap-8">
        <div className="flex w-full items-start justify-between gap-3">
          <div>
            {backHref || onBack ? (
              <AppBackButton backHref={backHref} onBack={onBack} backLabel={backLabel} />
            ) : (
              <div className="h-9 w-9" aria-hidden />
            )}
          </div>
          {trailingAction ? <div className="shrink-0">{trailingAction}</div> : null}
        </div>

        {showProgress ? (
          <div className="flex w-full max-w-xs flex-col items-start gap-2.5">
            <p className="text-xs font-medium tabular-nums text-muted">
              {currentStep} / {totalSteps}
            </p>
            <div
              className="relative h-1.5 w-full overflow-hidden rounded-full bg-black/10"
              role="progressbar"
              aria-valuenow={currentStep}
              aria-valuemin={1}
              aria-valuemax={totalSteps}
              aria-label={`Step ${currentStep} of ${totalSteps}`}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-pink-highlight transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}

        <div>
          <h1
            className={cn(
              "font-display text-[2.5rem] leading-tight tracking-tight lg:text-[2.75rem]",
              titleTone === "ink" ? "text-ink" : "text-pink-highlight",
            )}
          >
            {title}
          </h1>
          {sublabel ? (
            <p className="mt-2 text-xs font-medium uppercase tracking-overline text-pink-muted">
              {sublabel}
            </p>
          ) : null}
        </div>
      </div>

      {/* Mobile title block */}
      <div className={cn("text-center md:hidden", mobileTitleMargin)}>
        <h1
          className={cn(
            "font-display text-[clamp(2rem,7vw,2.75rem)] leading-tight tracking-tight",
            titleTone === "ink" ? "text-ink" : "text-pink-highlight",
          )}
        >
          {title}
        </h1>
        {sublabel ? (
          <p className="mt-2 text-[11px] font-medium uppercase tracking-overline text-pink-muted">
            {sublabel}
          </p>
        ) : null}
      </div>
    </header>
  );
}
