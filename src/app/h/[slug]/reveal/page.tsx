"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { flushSync } from "react-dom";

import { DevelopingPrepareOverlay } from "@/components/hangout/developing-prepare-overlay";
import { HangoutParticipantSessionGate } from "@/components/hangout/hangout-participant-session-gate";
import { FilmKeeperPromotionBanner } from "@/components/hangout/film-keeper-promotion-banner";
import {
  RevealExperience,
  type SetupFlowFooterState,
} from "@/components/hangout/reveal-experience";
import { SetupFlowHeader } from "@/components/layout/setup-flow-header";
import {
  SetupFlowFooter,
  SetupFlowShell,
  SETUP_FLOW_HEADER_COMPACT_CLASS,
  SETUP_FLOW_MAIN_CENTER_CLASS,
  SETUP_FLOW_MAIN_CLASS,
  SETUP_FLOW_MAIN_INNER_CLASS,
} from "@/components/layout/setup-flow-shell";
import { HangoutPageLoadGate } from "@/components/hangout/hangout-page-load-gate";
import { useDisplayHangout } from "@/hooks/use-display-hangout";
import { useFilmKeeperPromotion } from "@/hooks/use-film-keeper-promotion";
import { useHangoutGateBinding } from "@/hooks/use-hangout-gate-binding";
import { useHangoutRouteGuard } from "@/hooks/use-hangout-route-guard";
import { useHangoutSessionGuard } from "@/hooks/use-hangout-session-guard";
import { useInHangoutSession } from "@/hooks/use-in-hangout-session";
import { useRevealPrepare } from "@/hooks/use-reveal-prepare";
import { isCurrentFilmKeeper, isParticipantReadyForGuessing } from "@/lib/hangout/participant";
import type { MarkReadyForGuessingResult } from "@/types/reveal";
import type { Participant } from "@/types/participant";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";
import type { Hangout } from "@/types/hangout";

export default function RevealPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;

  const setHangout = useSessionStore((state) => state.setHangout);
  const setParticipant = useSessionStore((state) => state.setParticipant);
  const storeParticipant = useSessionStore((state) => state.participant);
  const [revealFooter, setRevealFooter] = useState<SetupFlowFooterState>({});
  const [developingFooter, setDevelopingFooter] = useState<SetupFlowFooterState>(
    {},
  );

  const { displayHangout, isLoading, loadError, retry } = useDisplayHangout();

  useHangoutRouteGuard({ slug, hangout: displayHangout, isLoading });
  const { participant, hasValidSession } = useHangoutSessionGuard({
    slug,
    hangout: displayHangout,
    isLoading,
  });
  const gateBinding = useHangoutGateBinding(slug, displayHangout, storeParticipant);
  const inHangoutSession = useInHangoutSession(slug);

  const isFilmKeeper = isCurrentFilmKeeper(participant, displayHangout);
  const { showPromotion, dismissPromotion } = useFilmKeeperPromotion({
    participant,
    hangout: displayHangout,
  });

  const isDeveloping = displayHangout?.status === "developing";
  const isRevealing = displayHangout?.status === "revealing";
  const onRevealPhase = isDeveloping || isRevealing;
  const revealPending = Boolean(displayHangout?.revealPendingAt);

  const prepare = useRevealPrepare({
    hangoutId: displayHangout?.id ?? "",
    sessionToken: participant?.sessionToken ?? "",
    enabled:
      inHangoutSession &&
      Boolean(displayHangout?.id && participant?.sessionToken) &&
      ((isDeveloping && revealPending) || isRevealing),
  });

  const handleHangoutUpdate = useCallback(
    (updated: Hangout) => {
      setHangout(updated);
    },
    [setHangout],
  );

  const handleSessionSync = useCallback(
    (payload: { hangout?: Hangout; participant?: Participant }) => {
      if (payload.hangout) {
        setHangout(payload.hangout);
      }
      if (payload.participant) {
        setParticipant(payload.participant);
      }
    },
    [setHangout, setParticipant],
  );

  const handleMarkReadyForGuessing = useCallback(
    (result: MarkReadyForGuessingResult) => {
      flushSync(() => {
        setHangout(result.hangout);
        setParticipant(result.participant);
      });
      router.replace(`/h/${slug}/guessing`);
    },
    [router, setHangout, setParticipant, slug],
  );

  const handleProceedToGuessing = useCallback(() => {
    router.replace(`/h/${slug}/guessing`);
  }, [router, slug]);

  const revealReady =
    hasValidSession &&
    participant &&
    displayHangout &&
    onRevealPhase;

  const activeFooter = isDeveloping ? developingFooter : revealFooter;

  return (
    <HangoutPageLoadGate
      loadError={loadError}
      isLoading={isLoading}
      displayHangout={displayHangout}
      forceLoading={!revealReady && !gateBinding}
      onRetry={retry}
      loadingSkeleton={
        <div className="animate-pulse space-y-6">
          <div className="h-24 w-full rounded-3xl border border-container-border bg-white" />
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="aspect-3/4 rounded-2xl bg-black/10" />
            <div className="aspect-3/4 rounded-2xl bg-black/10" />
          </div>
        </div>
      }
    >
      {gateBinding ? (
    <HangoutParticipantSessionGate
      slug={slug}
      hangoutId={gateBinding.hangoutId}
      sessionToken={gateBinding.sessionToken}
      hangoutTitle={gateBinding.hangoutTitle}
    >
      {revealReady && participant && displayHangout ? (
    <SetupFlowShell
      compact
      backgroundClassName={isDeveloping ? "bg-white md:bg-canvas" : undefined}
    >
      <header className={SETUP_FLOW_HEADER_COMPACT_CLASS}>
        <SetupFlowHeader
          compact
          showProgress={false}
          title={displayHangout.title}
          titleTone="ink"
          sublabel={
            isDeveloping
              ? "Developing memories"
              : isRevealing
                ? "Photo reveal"
                : undefined
          }
        />
      </header>

      <main className={cn(SETUP_FLOW_MAIN_CLASS, SETUP_FLOW_MAIN_CENTER_CLASS)}>
        <div
          className={cn(
            SETUP_FLOW_MAIN_INNER_CLASS,
            "flex min-h-0 w-full flex-1 flex-col justify-center gap-4",
          )}
        >
          <FilmKeeperPromotionBanner
            visible={showPromotion}
            onDismiss={dismissPromotion}
          />

          {isRevealing ? (
            <RevealExperience
              hangoutId={displayHangout.id}
              sessionToken={participant.sessionToken}
              alreadyReadyForGuessing={isParticipantReadyForGuessing(participant)}
              onMarkReadyForGuessing={handleMarkReadyForGuessing}
              onProceedToGuessing={handleProceedToGuessing}
              onSessionSync={handleSessionSync}
              onFooterChange={setRevealFooter}
              footerEnabled
              prepareReady={prepare.isReady}
            />
          ) : null}

          {isDeveloping ? (
            <DevelopingPrepareOverlay
              hangout={displayHangout}
              hangoutId={displayHangout.id}
              sessionToken={participant.sessionToken}
              isFilmKeeper={isFilmKeeper}
              prepare={prepare}
              onHangoutUpdate={handleHangoutUpdate}
              onFooterChange={setDevelopingFooter}
            />
          ) : null}
        </div>
      </main>

      <SetupFlowFooter hint={activeFooter.hint}>
        {activeFooter.children}
      </SetupFlowFooter>
    </SetupFlowShell>
      ) : null}
    </HangoutParticipantSessionGate>
      ) : null}
    </HangoutPageLoadGate>
  );
}
