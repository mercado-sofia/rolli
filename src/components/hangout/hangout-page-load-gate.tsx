"use client";

import type { ReactNode } from "react";

import {
  SetupFlowFooter,
  SetupFlowShell,
  SETUP_FLOW_HEADER_COMPACT_CLASS,
  SETUP_FLOW_MAIN_CENTER_CLASS,
  SETUP_FLOW_MAIN_CLASS,
  SETUP_FLOW_MAIN_INNER_CLASS,
} from "@/components/layout/setup-flow-shell";
import { Button } from "@/components/ui/button";
import { MobileLoadingSpinner } from "@/components/ui/mobile-loading-spinner";
import type { Hangout } from "@/types/hangout";
import { cn } from "@/lib/utils";

type HangoutPageLoadGateProps = {
  loadError: string | null;
  isLoading: boolean;
  displayHangout: Hangout | null;
  sessionHydrated?: boolean;
  /** Show loading shell while session guard or route guard resolves */
  forceLoading?: boolean;
  onRetry: () => void;
  /** Extra skeleton blocks shown on md+ while loading */
  loadingSkeleton?: ReactNode;
  mainClassName?: string;
  children: ReactNode;
};

export function HangoutPageLoadGate({
  loadError,
  isLoading,
  displayHangout,
  sessionHydrated = true,
  forceLoading = false,
  onRetry,
  loadingSkeleton,
  mainClassName,
  children,
}: HangoutPageLoadGateProps) {
  const hangoutLoadFailed =
    sessionHydrated && !isLoading && Boolean(loadError) && !displayHangout;

  const showLoadingShell =
    !sessionHydrated ||
    (!hangoutLoadFailed &&
      (isLoading || !displayHangout || forceLoading));

  if (!showLoadingShell && !hangoutLoadFailed) {
    return children;
  }

  return (
    <SetupFlowShell>
      <header className={SETUP_FLOW_HEADER_COMPACT_CLASS}>
        <div className="hidden animate-pulse md:flex md:flex-col md:gap-6">
          <div className="h-9 w-9 rounded-full bg-black/10" />
          <div className="h-10 w-52 rounded-lg bg-black/10" />
          <div className="h-3 w-28 rounded-full bg-black/10" />
        </div>
      </header>
      <main
        className={cn(
          SETUP_FLOW_MAIN_CLASS,
          SETUP_FLOW_MAIN_CENTER_CLASS,
          mainClassName,
        )}
      >
        <div className={SETUP_FLOW_MAIN_INNER_CLASS}>
          {hangoutLoadFailed ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-pink">{loadError}</p>
              <Button type="button" variant="secondary" onClick={onRetry}>
                Try again
              </Button>
            </div>
          ) : (
            <>
              <MobileLoadingSpinner />
              {loadingSkeleton ? (
                <div className="hidden md:block">{loadingSkeleton}</div>
              ) : null}
            </>
          )}
        </div>
      </main>
      <SetupFlowFooter>
        {hangoutLoadFailed ? (
          <Button type="button" variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        ) : (
          <div className="hidden h-12 w-full animate-pulse rounded-full bg-black/10 md:block" />
        )}
      </SetupFlowFooter>
    </SetupFlowShell>
  );
}
