"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { HangoutInvitationClosed } from "@/components/hangout/hangout-invitation-closed";
import { HangoutKickedOut } from "@/components/hangout/hangout-kicked-out";
import { JoinHangoutForm } from "@/components/hangout/join-hangout-form";
import { SetupFlowHeader } from "@/components/layout/setup-flow-header";
import {
  SetupFlowFooter,
  SetupFlowShell,
  SETUP_FLOW_HEADER_CLASS,
  SETUP_FLOW_MAIN_CENTER_CLASS,
  SETUP_FLOW_MAIN_CLASS,
  SETUP_FLOW_MAIN_INNER_CLASS,
} from "@/components/layout/setup-flow-shell";
import { Button } from "@/components/ui/button";
import { MobileLoadingSpinner } from "@/components/ui/mobile-loading-spinner";
import {
  fetchHangoutBySlug,
  getParticipantSessionStatus,
  rejoinHangout,
} from "@/lib/hangout/hangout-api";
import { isRemovedByKeeperError } from "@/lib/services/rpc-error";
import {
  getLateJoinHint,
  hangoutInviteReturnPath,
  isHangoutInProgress,
  isHangoutJoinable,
  isHangoutRejoinable,
  setWaitingReturnPath,
} from "@/lib/hangout/join";
import { isHangoutSessionValid } from "@/lib/hangout/participant";
import { hangoutParticipantPath } from "@/lib/hangout/routes";
import { APP_PRIMARY_BUTTON_CLASS } from "@/lib/app-page-layout";
import { SETUP_FLOW_TOTAL_STEPS, setupFlowSteps } from "@/lib/hangout/setup";
import { useSessionHydrated } from "@/hooks/use-session-hydrated";
import { useSessionStore } from "@/store/session-store";
import { cn } from "@/lib/utils";
import type { Hangout } from "@/types/hangout";

const INVITE_JOIN_FORM_ID = "invite-join-form";

function InviteLandingSkeleton({ message }: { message: string }) {
  return (
    <SetupFlowShell>
      <header className={SETUP_FLOW_HEADER_CLASS}>
        <div className="hidden animate-pulse md:flex md:flex-col md:gap-6">
          <div className="h-9 w-9 rounded-full bg-black/10" />
          <div className="h-3 w-24 rounded-full bg-black/10" />
          <div className="h-10 w-52 rounded-lg bg-black/10" />
        </div>
      </header>
      <main className={cn(SETUP_FLOW_MAIN_CLASS, SETUP_FLOW_MAIN_CENTER_CLASS)}>
        <div className={SETUP_FLOW_MAIN_INNER_CLASS}>
          <MobileLoadingSpinner />
          <div className="hidden h-56 w-full animate-pulse rounded-3xl border border-container-border bg-white md:block" />
        </div>
      </main>
      <SetupFlowFooter className="hidden md:block" hint={message}>
        <div className="hidden h-12 w-full animate-pulse rounded-full bg-black/10 md:block" />
      </SetupFlowFooter>
    </SetupFlowShell>
  );
}

export function InviteLanding() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;

  const sessionHangout = useSessionStore((state) => state.hangout);
  const sessionParticipant = useSessionStore((state) => state.participant);
  const setSession = useSessionStore((state) => state.setSession);
  const resetSession = useSessionStore((state) => state.resetSession);
  const leaveForHome = useSessionStore((state) => state.leaveForHome);
  const sessionHydrated = useSessionHydrated();

  const [hangout, setHangout] = useState<Hangout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejoining, setRejoining] = useState(false);
  const [rejoinFailed, setRejoinFailed] = useState(false);
  const [removedByKeeper, setRemovedByKeeper] = useState(false);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [serverIsActive, setServerIsActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleGoHome() {
    leaveForHome();
    router.replace("/");
  }

  function handleJoinAgain() {
    resetSession();
    setRemovedByKeeper(false);
    setSessionResolved(true);
    setServerIsActive(false);
    setRejoinFailed(false);
  }

  const hasValidSession =
    sessionHydrated &&
    isHangoutSessionValid(slug, hangout, sessionParticipant, sessionHangout);

  const canEnterHangout =
    sessionResolved &&
    hasValidSession &&
    serverIsActive &&
    !removedByKeeper &&
    hangout?.status !== "cancelled";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await fetchHangoutBySlug(slug);

      if (cancelled) return;

      if (fetchError || !data) {
        setHangout(null);
        setError(fetchError ?? "Hangout not found");
        setLoading(false);
        return;
      }

      setHangout(data);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!sessionHydrated || loading || !hangout) {
      return;
    }

    let cancelled = false;

    async function resolveSession() {
      setSessionResolved(false);

      if (!sessionParticipant?.sessionToken) {
        if (!cancelled) {
          setRemovedByKeeper(false);
          setServerIsActive(false);
          setSessionResolved(true);
        }
        return;
      }

      const { data, error: statusError } = await getParticipantSessionStatus(
        hangout!.id,
        sessionParticipant.sessionToken,
      );

      if (cancelled) return;

      if (statusError && isRemovedByKeeperError(statusError)) {
        setRemovedByKeeper(true);
        setServerIsActive(false);
      } else if (data?.removedByKeeper) {
        setRemovedByKeeper(true);
        setServerIsActive(false);
      } else if (data) {
        setRemovedByKeeper(false);
        setServerIsActive(data.isActive);
      } else {
        setRemovedByKeeper(false);
        setServerIsActive(false);
      }

      setSessionResolved(true);
    }

    void resolveSession();

    return () => {
      cancelled = true;
    };
  }, [hangout, loading, sessionHydrated, sessionParticipant?.sessionToken]);

  useEffect(() => {
    if (!sessionHydrated || loading || !hangout || rejoining || removedByKeeper) return;
    if (!sessionResolved) return;
    if (hasValidSession && serverIsActive) return;

    const canTryRejoin =
      Boolean(sessionParticipant?.sessionToken) &&
      isHangoutRejoinable(hangout.status) &&
      !rejoinFailed;

    if (canTryRejoin) return;

    if (sessionParticipant || sessionHangout) {
      resetSession();
    }
  }, [
    hangout,
    hasValidSession,
    loading,
    rejoinFailed,
    rejoining,
    resetSession,
    serverIsActive,
    sessionHangout,
    sessionHydrated,
    sessionParticipant,
    sessionResolved,
    removedByKeeper,
  ]);

  useEffect(() => {
    if (
      loading ||
      !hangout ||
      !sessionResolved ||
      removedByKeeper ||
      (hasValidSession && serverIsActive)
    ) {
      return;
    }
    if (!sessionHydrated || !sessionParticipant?.sessionToken) return;
    if (!isHangoutRejoinable(hangout.status)) return;

    let cancelled = false;

    async function tryRejoin() {
      setRejoining(true);

      const { data, error: rejoinError } = await rejoinHangout(
        slug,
        sessionParticipant!.sessionToken,
      );

      if (cancelled) return;

      setRejoining(false);

      if (rejoinError || !data) {
        if (rejoinError && isRemovedByKeeperError(rejoinError)) {
          setRemovedByKeeper(true);
        } else {
          setRejoinFailed(true);
        }
        return;
      }

      setSession(data.hangout, data.participant);
      setServerIsActive(true);
      if (data.hangout.status === "waiting") {
        setWaitingReturnPath(slug, hangoutInviteReturnPath(slug));
      }
      router.replace(hangoutParticipantPath(slug, data.hangout.status));
    }

    void tryRejoin();

    return () => {
      cancelled = true;
    };
  }, [
    hangout,
    hasValidSession,
    loading,
    rejoinFailed,
    router,
    serverIsActive,
    sessionHydrated,
    sessionParticipant,
    sessionResolved,
    setSession,
    slug,
    removedByKeeper,
  ]);

  useEffect(() => {
    if (!canEnterHangout || !hangout) {
      return;
    }

    router.replace(hangoutParticipantPath(slug, hangout.status));
  }, [canEnterHangout, hangout, router, slug]);

  if (removedByKeeper && hangout) {
    return (
      <HangoutKickedOut
        title={hangout.title}
        slug={slug}
        onGoHome={handleGoHome}
        onJoinAgain={handleJoinAgain}
      />
    );
  }

  const resolvingSession =
    Boolean(sessionParticipant?.sessionToken) && !sessionResolved;

  if (loading || !sessionHydrated || rejoining || resolvingSession) {
    return (
      <InviteLandingSkeleton
        message={
          rejoining
            ? "Rejoining your hangout…"
            : resolvingSession
              ? "Checking your session…"
              : !sessionHydrated
                ? "Loading your session…"
                : "Loading invitation…"
        }
      />
    );
  }

  if (error || !hangout) {
    return (
      <SetupFlowShell>
        <header className={SETUP_FLOW_HEADER_CLASS}>
          <SetupFlowHeader
            currentStep={1}
            totalSteps={SETUP_FLOW_TOTAL_STEPS}
            backHref="/start"
            title="Link not found"
            sublabel="Invitation"
          />
        </header>

        <main
          className={cn(
            SETUP_FLOW_MAIN_CLASS,
            SETUP_FLOW_MAIN_CENTER_CLASS,
          )}
        >
          <div className={SETUP_FLOW_MAIN_INNER_CLASS}>
            <p className="text-center text-sm text-muted">
              {error ?? "This hangout does not exist or the link is incorrect."}
            </p>
          </div>
        </main>

        <SetupFlowFooter hint="Double-check the link or ask your Film Keeper for a new one." />
      </SetupFlowShell>
    );
  }

  if (canEnterHangout) {
    return <InviteLandingSkeleton message="Taking you to your hangout…" />;
  }

  if (!isHangoutJoinable(hangout.status)) {
    if (hangout.status === "cancelled") {
      return <HangoutInvitationClosed title={hangout.title} />;
    }

    return (
      <SetupFlowShell>
        <header className={SETUP_FLOW_HEADER_CLASS}>
          <SetupFlowHeader
            currentStep={setupFlowSteps.inviteJoin}
            totalSteps={SETUP_FLOW_TOTAL_STEPS}
            onBack={handleGoHome}
            backLabel="Go home"
            title={hangout.title}
            sublabel="Invitation closed"
          />
        </header>

        <main
          className={cn(
            SETUP_FLOW_MAIN_CLASS,
            SETUP_FLOW_MAIN_CENTER_CLASS,
          )}
        >
          <div className={SETUP_FLOW_MAIN_INNER_CLASS}>
            <p className="text-center text-sm text-muted">
              This hangout has ended. New guests cannot join.
            </p>
            <button
              type="button"
              onClick={handleGoHome}
              className="mt-6 w-full text-center text-sm text-muted underline underline-offset-4"
            >
              Go home
            </button>
          </div>
        </main>

        <SetupFlowFooter hint="This hangout has ended — new guests can't join." />
      </SetupFlowShell>
    );
  }

  const hangoutInProgress = isHangoutInProgress(hangout.status);

  return (
    <SetupFlowShell>
      <header className={SETUP_FLOW_HEADER_CLASS}>
        <SetupFlowHeader
          currentStep={setupFlowSteps.inviteJoin}
          totalSteps={SETUP_FLOW_TOTAL_STEPS}
          onBack={handleGoHome}
          backLabel="Go home"
          title={hangout.title}
          sublabel={hangoutInProgress ? "Hangout in progress" : "You're invited"}
        />
      </header>

      <main
        className={cn(
          SETUP_FLOW_MAIN_CLASS,
          SETUP_FLOW_MAIN_CENTER_CLASS,
        )}
      >
        <div className={SETUP_FLOW_MAIN_INNER_CLASS}>
          <JoinHangoutForm
            slug={slug}
            hangoutTitle={hangout.title}
            formId={INVITE_JOIN_FORM_ID}
            onSubmittingChange={setIsSubmitting}
          />
        </div>
      </main>

      <SetupFlowFooter
        hint={
          hangoutInProgress
            ? (getLateJoinHint(hangout.status) ??
              "This hangout is already underway — you'll land in the room with everyone else.")
            : "Join with a nickname — your real name stays secret until reveal."
        }
      >
        <Button
          type="submit"
          form={INVITE_JOIN_FORM_ID}
          disabled={isSubmitting}
          className={APP_PRIMARY_BUTTON_CLASS}
        >
          {isSubmitting ? "Joining hangout…" : "Join hangout"}
        </Button>
      </SetupFlowFooter>
    </SetupFlowShell>
  );
}
