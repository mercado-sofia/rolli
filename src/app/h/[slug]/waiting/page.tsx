"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { LuMoon } from "react-icons/lu";

import {
  type AbandonHangoutUiState,
  AbandonHangoutControl,
} from "@/components/hangout/abandon-hangout-control";
import { LeaveRoomButton } from "@/components/hangout/back-home-button";
import { HangoutCardIcon } from "@/components/hangout/hangout-card-icon";
import {
  HANGOUT_CANCELLED_FOOTER_HINT,
  HangoutInvitationClosedContent,
} from "@/components/hangout/hangout-invitation-closed";
import { GuestWaitingRoomBack } from "@/components/hangout/guest-waiting-room-back";
import { HangoutParticipantSessionGate } from "@/components/hangout/hangout-participant-session-gate";
import { WaitingRoomNickname } from "@/components/hangout/waiting-room-nickname";
import { SetupFlowHeader } from "@/components/layout/setup-flow-header";
import {
  SetupFlowFooter,
  SetupFlowShell,
  SETUP_FLOW_HEADER_COMPACT_CLASS,
  SETUP_FLOW_MAIN_CENTER_CLASS,
  SETUP_FLOW_MAIN_CLASS,
  SETUP_FLOW_MAIN_INNER_CLASS,
} from "@/components/layout/setup-flow-shell";
import { Button } from "@/components/ui/button";
import { HangoutPageLoadGate } from "@/components/hangout/hangout-page-load-gate";
import { Card } from "@/components/ui/card";
import { FilmKeeperPromotionBanner } from "@/components/hangout/film-keeper-promotion-banner";
import { useDisplayHangout } from "@/hooks/use-display-hangout";
import { useFilmKeeperPromotion } from "@/hooks/use-film-keeper-promotion";
import { useHangoutGateBinding } from "@/hooks/use-hangout-gate-binding";
import { useHangoutRouteGuard } from "@/hooks/use-hangout-route-guard";
import { useHangoutSessionGuard } from "@/hooks/use-hangout-session-guard";
import { isCurrentFilmKeeper } from "@/lib/hangout/participant";
import {
  APP_PRIMARY_BUTTON_CLASS,
  HANGOUT_PINK_GRADIENT_BUTTON_CLASS,
} from "@/lib/app-page-layout";
import { HANGOUT_LIMITS } from "@/lib/constants";
import { startHangout } from "@/lib/hangout/hangout-api";
import { hangoutSharePath } from "@/lib/hangout/routes";
import { markSessionGuidePending, SETUP_FLOW_TOTAL_STEPS, setupFlowSteps } from "@/lib/hangout/setup";
import { getWaitingHint } from "@/lib/hangout/waiting-hint";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";

export default function WaitingRoomPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;

  const setHangout = useSessionStore((state) => state.setHangout);
  const storeParticipant = useSessionStore((state) => state.participant);
  const leaveForHomeFromStore = useSessionStore((state) => state.leaveForHome);

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [abandonUiState, setAbandonUiState] = useState<AbandonHangoutUiState>("idle");

  const { displayHangout, loadError, isLoading, retry } = useDisplayHangout(slug);
  const isCancelled = displayHangout?.status === "cancelled";
  const pauseGuards = abandonUiState !== "idle";
  const guardIsLoading = isLoading || pauseGuards;
  const showAbandonSuccessModal = abandonUiState === "success";

  const leaveForHome = useCallback(() => {
    setAbandonUiState("leaving");
    leaveForHomeFromStore();
    router.replace("/");
  }, [leaveForHomeFromStore, router]);

  useHangoutRouteGuard({ slug, hangout: displayHangout, isLoading: guardIsLoading });
  const { participant, hasValidSession } = useHangoutSessionGuard({
    slug,
    hangout: displayHangout,
    isLoading: guardIsLoading,
  });
  const gateBinding = useHangoutGateBinding(slug, displayHangout, storeParticipant);

  const participantCount = displayHangout?.participantCount ?? 0;
  const isFilmKeeper = isCurrentFilmKeeper(participant, displayHangout);
  const { showPromotion, dismissPromotion } = useFilmKeeperPromotion({
    participant,
    hangout: displayHangout,
  });
  const canStart =
    participantCount >= HANGOUT_LIMITS.minToStart &&
    participantCount <= HANGOUT_LIMITS.maxToStart;

  async function handleStartHangout() {
    if (!participant || !displayHangout) return;

    setStarting(true);
    setStartError(null);

    const { data, error } = await startHangout(
      displayHangout.id,
      participant.sessionToken,
    );

    setStarting(false);

    if (error || !data) {
      setStartError(error ?? "Could not start hangout");
      return;
    }

    setHangout(data);
    markSessionGuidePending(slug);
    router.replace(`/h/${slug}/session`);
  }

  const waitingReady =
    Boolean(displayHangout) &&
    (isCancelled ||
      (hasValidSession &&
        participant &&
        displayHangout!.status === "waiting"));
  const showWaitingGate =
    Boolean(gateBinding) &&
    (isCancelled ||
      (hasValidSession &&
        participant &&
        displayHangout?.status === "waiting"));

  const waitingHint = getWaitingHint(isFilmKeeper, canStart);
  const footerHint = isCancelled ? HANGOUT_CANCELLED_FOOTER_HINT : waitingHint;

  return (
    <HangoutPageLoadGate
      loadError={loadError}
      isLoading={isLoading}
      displayHangout={displayHangout}
      forceLoading={!waitingReady && !gateBinding}
      onRetry={retry}
      loadingSkeleton={
        <div className="animate-pulse space-y-6">
          <div className="h-40 w-full rounded-3xl border border-container-border bg-white" />
          <div className="h-36 w-full rounded-3xl border border-container-border bg-white" />
        </div>
      }
    >
      {gateBinding && displayHangout ? (
    <HangoutParticipantSessionGate
      slug={slug}
      hangoutId={gateBinding.hangoutId}
      sessionToken={gateBinding.sessionToken}
      hangoutTitle={gateBinding.hangoutTitle}
      enabled={!isCancelled}
    >
      {showWaitingGate && participant ? (
    <SetupFlowShell>
      <header className={SETUP_FLOW_HEADER_COMPACT_CLASS}>
        {isCancelled ? (
          <SetupFlowHeader
            currentStep={setupFlowSteps.inviteJoin}
            totalSteps={SETUP_FLOW_TOTAL_STEPS}
            onBack={leaveForHome}
            title={displayHangout.title}
            sublabel="Invitation closed"
          />
        ) : isFilmKeeper ? (
          <SetupFlowHeader
            showProgress={false}
            title={displayHangout.title}
            sublabel="Waiting room"
            backHref={hangoutSharePath(slug)}
            backLabel="Back to invite link"
          />
        ) : (
          <GuestWaitingRoomBack
            slug={slug}
            hangoutId={displayHangout.id}
            sessionToken={participant!.sessionToken}
            title={displayHangout.title}
          />
        )}
      </header>

      <main
        className={cn(
          SETUP_FLOW_MAIN_CLASS,
          SETUP_FLOW_MAIN_CENTER_CLASS,
        )}
      >
        <div className={SETUP_FLOW_MAIN_INNER_CLASS}>
          {isCancelled ? (
            <HangoutInvitationClosedContent
              showGoHomeLink={!showAbandonSuccessModal}
              onGoHomeClick={leaveForHome}
            />
          ) : (
            <div className="flex flex-col gap-6">
              <FilmKeeperPromotionBanner
                visible={showPromotion}
                onDismiss={dismissPromotion}
              />

              <Card border="neutral" className="text-center">
                <HangoutCardIcon
                  icon={LuMoon}
                  borderTone="ink"
                  containerClassName="md:h-14 md:w-14"
                  iconClassName="text-ink md:h-7 md:w-7"
                />
                <p className="font-display mt-4 text-2xl leading-snug text-ink">
                  {participantCount}{" "}
                  {participantCount === 1
                    ? "friend is in the room"
                    : "friends are in the room"}
                </p>
              </Card>

              <Card border="neutral">
                <dl className="space-y-3 text-sm">
                  <WaitingRoomNickname nickname={participant!.nickname} />
                  {isFilmKeeper && (
                    <div className="rounded-2xl border border-container-border bg-white px-4 py-3 text-center text-sm text-ink">
                      You are the{" "}
                      <span className="font-medium text-pink-highlight">
                        Film Keeper
                      </span>
                    </div>
                  )}
                </dl>
              </Card>
            </div>
          )}
        </div>
      </main>

      <SetupFlowFooter hint={footerHint}>
        {isFilmKeeper && participant ? (
          <div className={cn("flex w-full flex-col gap-3", isCancelled && "sr-only")}>
            {!isCancelled ? (
              <>
                {startError && (
                  <p className="text-center text-sm text-pink">{startError}</p>
                )}
                {!canStart && participantCount > 0 && (
                  <p className="text-center text-xs text-muted">
                    Need {HANGOUT_LIMITS.minToStart}–{HANGOUT_LIMITS.maxToStart}{" "}
                    participants to start
                  </p>
                )}
                <Button
                  type="button"
                  disabled={!canStart || starting}
                  onClick={() => void handleStartHangout()}
                  className={cn(APP_PRIMARY_BUTTON_CLASS, HANGOUT_PINK_GRADIENT_BUTTON_CLASS)}
                >
                  {starting ? "Starting…" : "Start hangout"}
                </Button>
              </>
            ) : null}
            <div className="grid w-full grid-cols-2 gap-3">
              <LeaveRoomButton
                hangoutId={displayHangout.id}
                sessionToken={participant.sessionToken}
                isFilmKeeper
                className={cn(APP_PRIMARY_BUTTON_CLASS, "min-w-0")}
              />
              <AbandonHangoutControl
                hangoutId={displayHangout.id}
                sessionToken={participant.sessionToken}
                triggerVariant="pill"
                onAbandoned={setHangout}
                onUiStateChange={setAbandonUiState}
                className={cn(APP_PRIMARY_BUTTON_CLASS, "min-w-0")}
              />
            </div>
          </div>
        ) : null}
        {!isCancelled && !isFilmKeeper ? (
          <LeaveRoomButton
            hangoutId={displayHangout.id}
            sessionToken={participant!.sessionToken}
            className={APP_PRIMARY_BUTTON_CLASS}
          />
        ) : null}
      </SetupFlowFooter>
    </SetupFlowShell>
      ) : null}
    </HangoutParticipantSessionGate>
      ) : null}
    </HangoutPageLoadGate>
  );
}
