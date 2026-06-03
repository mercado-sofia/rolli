"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

import { HangoutKickedOut } from "@/components/hangout/hangout-kicked-out";
import { MobileLoadingSpinner } from "@/components/ui/mobile-loading-spinner";
import { useParticipantSessionStatus } from "@/hooks/use-participant-session-status";
import {
  SetupFlowFooter,
  SetupFlowShell,
  SETUP_FLOW_HEADER_COMPACT_CLASS,
  SETUP_FLOW_MAIN_CENTER_CLASS,
  SETUP_FLOW_MAIN_CLASS,
  SETUP_FLOW_MAIN_INNER_CLASS,
} from "@/components/layout/setup-flow-shell";
import { pauseRevealAmbientAudio } from "@/lib/hangout/reveal-audio";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";

type HangoutParticipantSessionGateProps = {
  slug: string;
  hangoutId: string;
  sessionToken: string;
  hangoutTitle?: string;
  enabled?: boolean;
  children: ReactNode;
};

export function HangoutParticipantSessionGate({
  slug,
  hangoutId,
  sessionToken,
  hangoutTitle,
  enabled = true,
  children,
}: HangoutParticipantSessionGateProps) {
  const router = useRouter();
  const resetSession = useSessionStore((state) => state.resetSession);
  const evictFromHangout = useSessionStore((state) => state.evictFromHangout);
  const { removedByKeeper, isActive, isReady, isChecking } =
    useParticipantSessionStatus({
      hangoutId,
      sessionToken,
      enabled,
    });

  const redirectedInactiveRef = useRef(false);
  const evictedRef = useRef(false);

  useLayoutEffect(() => {
    if (!removedByKeeper || evictedRef.current) {
      return;
    }

    evictedRef.current = true;
    pauseRevealAmbientAudio();
    evictFromHangout(slug);
  }, [evictFromHangout, removedByKeeper, slug]);

  useEffect(() => {
    if (!enabled || !isReady || removedByKeeper || isActive) {
      redirectedInactiveRef.current = false;
      return;
    }

    if (redirectedInactiveRef.current) {
      return;
    }

    redirectedInactiveRef.current = true;
    resetSession();
    router.replace(`/h/${slug}`);
  }, [
    enabled,
    isActive,
    isReady,
    removedByKeeper,
    resetSession,
    router,
    slug,
  ]);

  function handleJoinAgain() {
    resetSession();
    router.replace(`/h/${slug}`);
  }

  if (removedByKeeper) {
    return (
      <HangoutKickedOut
        title={hangoutTitle}
        slug={slug}
        onJoinAgain={handleJoinAgain}
      />
    );
  }

  if (isChecking || !isReady || !isActive) {
    return (
      <SetupFlowShell compact>
        <header className={SETUP_FLOW_HEADER_COMPACT_CLASS} />
        <main className={cn(SETUP_FLOW_MAIN_CLASS, SETUP_FLOW_MAIN_CENTER_CLASS)}>
          <div className={SETUP_FLOW_MAIN_INNER_CLASS}>
            <MobileLoadingSpinner />
          </div>
        </main>
        <SetupFlowFooter hint="Checking your session…" />
      </SetupFlowShell>
    );
  }

  return children;
}
