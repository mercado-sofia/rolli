"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { TbPhotoSquareRounded } from "react-icons/tb";

import {
  BackHomeButton,
  LeaveRoomButton,
} from "@/components/hangout/back-home-button";
import { HangoutMenuButton } from "@/components/hangout/hangout-menu-button";
import {
  HangoutMenuLayer,
  type HangoutMenuLayerHandle,
} from "@/components/hangout/hangout-menu-layer";
import { HangoutParticipantSessionGate } from "@/components/hangout/hangout-participant-session-gate";
import { FilmKeeperPromotionBanner } from "@/components/hangout/film-keeper-promotion-banner";
import {
  GuessingExperience,
  type SetupFlowFooterState,
} from "@/components/hangout/guessing-experience";
import { SetupFlowHeader } from "@/components/layout/setup-flow-header";
import {
  SetupFlowFooter,
  SetupFlowShell,
  SETUP_FLOW_HEADER_COMPACT_CLASS,
  SETUP_FLOW_MAIN_CLASS,
  SETUP_FLOW_MAIN_INNER_CLASS,
  SETUP_FLOW_MAIN_UPPER_CLASS,
} from "@/components/layout/setup-flow-shell";
import { HangoutPageLoadGate } from "@/components/hangout/hangout-page-load-gate";
import { useDisplayHangout } from "@/hooks/use-display-hangout";
import { useFilmKeeperPromotion } from "@/hooks/use-film-keeper-promotion";
import { useHangoutGateBinding } from "@/hooks/use-hangout-gate-binding";
import { useHangoutRouteGuard } from "@/hooks/use-hangout-route-guard";
import { useHangoutSessionGuard } from "@/hooks/use-hangout-session-guard";
import { Button } from "@/components/ui/button";
import {
  APP_PRIMARY_BUTTON_CLASS,
  HANGOUT_PINK_GRADIENT_BUTTON_CLASS,
} from "@/lib/app-page-layout";
import { isParticipantReadyForGuessing } from "@/lib/hangout/participant";
import {
  HANGOUT_GUESSING_PATH_SUFFIX,
  hangoutGalleryPath,
} from "@/lib/hangout/routes";
import { fetchHangoutBySlug, finishGuessing } from "@/lib/hangout/hangout-api";
import type { Hangout } from "@/types/hangout";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";

export default function GuessingPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();

  const setHangout = useSessionStore((state) => state.setHangout);
  const storeParticipant = useSessionStore((state) => state.participant);
  const { displayHangout, isLoading, loadError, retry } = useDisplayHangout();
  const [footer, setFooter] = useState<SetupFlowFooterState>({});
  const [navigatingToGallery, setNavigatingToGallery] = useState(false);
  const menuLayerRef = useRef<HangoutMenuLayerHandle>(null);

  useHangoutRouteGuard({
    slug,
    hangout: displayHangout,
    isLoading,
    guardPathSuffix: HANGOUT_GUESSING_PATH_SUFFIX,
  });

  const { participant, hasValidSession } = useHangoutSessionGuard({
    slug,
    hangout: displayHangout,
    isLoading,
  });
  const gateBinding = useHangoutGateBinding(slug, displayHangout, storeParticipant);

  const openMemoryGallery = useCallback(async () => {
    if (navigatingToGallery) return;

    setNavigatingToGallery(true);

    try {
      if (displayHangout?.status === "completed") {
        router.push(hangoutGalleryPath(slug));
        return;
      }

      if (displayHangout?.status === "guessing" && participant) {
        const { data, error } = await finishGuessing(
          displayHangout.id,
          participant.sessionToken,
        );

        if (data) {
          setHangout(data);
          router.push(hangoutGalleryPath(slug));
          return;
        }

        if (error?.includes("not in the guessing phase")) {
          const { data: refreshed } = await fetchHangoutBySlug(slug);
          if (refreshed?.status === "completed") {
            setHangout(refreshed);
            router.push(hangoutGalleryPath(slug));
            return;
          }
        }
      }

      setNavigatingToGallery(false);
    } catch {
      setNavigatingToGallery(false);
    }
  }, [
    displayHangout,
    navigatingToGallery,
    participant,
    router,
    setHangout,
    slug,
  ]);

  const participantReadyForGuessing = isParticipantReadyForGuessing(participant);

  const isGuessingPhase =
    displayHangout?.status === "guessing" ||
    displayHangout?.status === "completed" ||
    (displayHangout?.status === "revealing" && participantReadyForGuessing);

  const isCompleted = displayHangout?.status === "completed";
  const showMenu = isGuessingPhase && !isCompleted;
  const menuButton = showMenu ? (
    <HangoutMenuButton onClick={() => menuLayerRef.current?.open()} />
  ) : undefined;
  const { showPromotion, dismissPromotion } = useFilmKeeperPromotion({
    participant,
    hangout: displayHangout,
  });

  const handleHangoutCompleted = useCallback(
    async (freshHangout?: Hangout) => {
      if (freshHangout) {
        setHangout(freshHangout);
        return;
      }

      const { data } = await fetchHangoutBySlug(slug);
      if (data) {
        setHangout(data);
      }
    },
    [setHangout, slug],
  );

  const guessingReady =
    hasValidSession && participant && displayHangout && isGuessingPhase;

  const footerActions = footer.showGalleryButton ? (
    <>
      <Button
        type="button"
        className={HANGOUT_PINK_GRADIENT_BUTTON_CLASS}
        disabled={navigatingToGallery}
        onClick={openMemoryGallery}
      >
        <TbPhotoSquareRounded className="h-4 w-4 shrink-0" aria-hidden />
        {navigatingToGallery ? "View memory gallery…" : "View memory gallery"}
      </Button>
      <BackHomeButton className={APP_PRIMARY_BUTTON_CLASS} />
    </>
  ) : isCompleted ? (
    <BackHomeButton className={APP_PRIMARY_BUTTON_CLASS} />
  ) : showMenu ? (
    <>
      {footer.children}
      <LeaveRoomButton
        hangoutId={displayHangout!.id}
        sessionToken={participant!.sessionToken}
        className={APP_PRIMARY_BUTTON_CLASS}
      />
    </>
  ) : (
    footer.children
  );

  const pageFooter = (
    <SetupFlowFooter hint={footer.showGalleryButton ? undefined : footer.hint}>
      {footerActions}
    </SetupFlowFooter>
  );

  return (
    <HangoutPageLoadGate
      loadError={loadError}
      isLoading={isLoading}
      displayHangout={displayHangout}
      forceLoading={!guessingReady && !gateBinding}
      onRetry={retry}
      loadingSkeleton={
        <div className="animate-pulse space-y-6">
          <div className="h-24 w-full rounded-3xl border border-container-border bg-white" />
          <div className="h-36 w-full rounded-3xl border border-container-border bg-white" />
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
      {guessingReady && participant && displayHangout ? (
    <SetupFlowShell compact>
      {showMenu ? (
        <HangoutMenuLayer
          ref={menuLayerRef}
          mode="guessing"
          hangoutId={displayHangout.id}
          sessionToken={participant.sessionToken}
          hangout={displayHangout}
          participant={participant}
          rosterEnabled={Boolean(guessingReady && showMenu)}
          onHangoutUpdate={setHangout}
          onHangoutCompleted={handleHangoutCompleted}
        />
      ) : null}

      <header className={SETUP_FLOW_HEADER_COMPACT_CLASS}>
        <SetupFlowHeader
          compact
          showProgress={false}
          title={displayHangout.title}
          sublabel={isCompleted ? "Results" : "Guessing phase"}
          titleTone="ink"
          trailingAction={menuButton}
        />
      </header>

      <main className={cn(SETUP_FLOW_MAIN_CLASS, SETUP_FLOW_MAIN_UPPER_CLASS)}>
        <div className={cn(SETUP_FLOW_MAIN_INNER_CLASS, "flex flex-col gap-4")}>
          <FilmKeeperPromotionBanner
            visible={showPromotion}
            onDismiss={dismissPromotion}
          />
          <GuessingExperience
            hangoutId={displayHangout.id}
            sessionToken={participant.sessionToken}
            hangoutStatus={displayHangout.status}
            canAccessGuessing={isGuessingPhase}
            onHangoutCompleted={handleHangoutCompleted}
            onFooterChange={setFooter}
          />
        </div>
      </main>

      {pageFooter}
    </SetupFlowShell>
      ) : null}
    </HangoutParticipantSessionGate>
      ) : null}
    </HangoutPageLoadGate>
  );
}
