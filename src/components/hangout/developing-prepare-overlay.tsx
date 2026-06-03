"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { LuFilm } from "react-icons/lu";

import { HangoutCardIcon } from "@/components/hangout/hangout-card-icon";
import { RevealCountdownOverlay } from "@/components/hangout/reveal-countdown-overlay";
import { Button } from "@/components/ui/button";
import { useRevealCountdown } from "@/hooks/use-reveal-countdown";
import type { useRevealPrepare } from "@/hooks/use-reveal-prepare";
import {
  APP_PRIMARY_BUTTON_CLASS,
} from "@/lib/app-page-layout";
import { signalRevealPending, startReveal } from "@/lib/hangout/hangout-api";
import {
  getRevealCountdownMs,
  getRevealPreload,
  isRevealCountdownActive,
  isRevealPreloadUsable,
  preloadRevealAmbientAudio,
  preloadRevealState,
} from "@/lib/hangout/reveal-preload";
import { unlockRevealAmbientAudioForAutoplay } from "@/lib/hangout/reveal-audio";
import type { Hangout } from "@/types/hangout";
import { cn } from "@/lib/utils";

function DevelopingStatusMessage({
  revealStarting,
  isFilmKeeper,
  prepareStatus,
  prepareError,
  onRetry,
}: {
  revealStarting: boolean;
  isFilmKeeper: boolean;
  prepareStatus: ReturnType<typeof useRevealPrepare>["status"];
  prepareError: string | null;
  onRetry: () => void;
}) {
  if (revealStarting) {
    if (prepareStatus === "loading" || prepareStatus === "idle") {
      return (
        <div className="mt-4 flex flex-col items-center gap-3">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-pink-highlight/25 border-t-pink-highlight"
            aria-hidden
          />
          <p className="text-sm leading-relaxed text-muted">
            Preparing memories…
          </p>
        </div>
      );
    }

    if (prepareStatus === "error") {
      return (
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-relaxed text-pink">
            {prepareError ?? "Could not prepare memories."}
          </p>
          <Button type="button" variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      );
    }

    return (
      <p className="mt-3 text-sm font-medium leading-relaxed text-pink-highlight">
        Reveal starting…
      </p>
    );
  }

  if (isFilmKeeper) {
    return (
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Tap Start reveal when everyone is ready.
      </p>
    );
  }

  return (
    <p className="mt-3 text-sm leading-relaxed text-muted">
      Waiting for the Film Keeper to start the reveal…
    </p>
  );
}

const DEVELOPING_OVERLAY_PANEL_CLASS = cn(
  "flex w-full flex-col items-center justify-center px-4 text-center sm:px-6",
);

type DevelopingOverlayPanelProps = {
  revealStarting: boolean;
  isFilmKeeper: boolean;
  prepare: ReturnType<typeof useRevealPrepare>;
};

function DevelopingOverlayPanel({
  revealStarting,
  isFilmKeeper,
  prepare,
}: DevelopingOverlayPanelProps) {
  return (
    <div className={DEVELOPING_OVERLAY_PANEL_CLASS}>
      <HangoutCardIcon
        icon={LuFilm}
        borderTone="ink"
        iconClassName="text-ink"
      />
      <p className="font-display mt-4 max-w-md text-2xl leading-snug">
        {revealStarting ? "Reveal starting" : "Memories in the darkroom"}
      </p>
      <DevelopingStatusMessage
        revealStarting={revealStarting}
        isFilmKeeper={isFilmKeeper}
        prepareStatus={prepare.status}
        prepareError={prepare.error}
        onRetry={prepare.retry}
      />
    </div>
  );
}

export type DevelopingPrepareOverlayProps = {
  hangout: Hangout;
  hangoutId: string;
  sessionToken: string;
  isFilmKeeper: boolean;
  prepare: ReturnType<typeof useRevealPrepare>;
  onHangoutUpdate: (hangout: Hangout) => void;
  onFooterChange: (footer: {
    hint?: string;
    children?: ReactNode;
  }) => void;
};

export function DevelopingPrepareOverlay({
  hangout,
  hangoutId,
  sessionToken,
  isFilmKeeper,
  prepare,
  onHangoutUpdate,
  onFooterChange,
}: DevelopingPrepareOverlayProps) {
  const [starting, setStarting] = useState(false);
  const [signaling, setSignaling] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [countdownStartedAt, setCountdownStartedAt] = useState<number | null>(
    null,
  );
  const finishingRevealRef = useRef(false);

  const countdownMs = getRevealCountdownMs(prepare.photoCount);
  const countdownActive = isRevealCountdownActive(
    countdownStartedAt,
    countdownMs,
  );
  const revealStarting = Boolean(hangout.revealPendingAt);

  const handleCountdownComplete = useCallback(async () => {
    if (finishingRevealRef.current) return;

    finishingRevealRef.current = true;
    setStarting(true);
    setStartError(null);

    const cached = getRevealPreload(hangoutId);
    if (!isRevealPreloadUsable(cached)) {
      const ok = await preloadRevealState(hangoutId, sessionToken);
      if (!ok) {
        finishingRevealRef.current = false;
        setStarting(false);
        setCountdownStartedAt(null);
        setStartError("Could not prepare memories. Check your connection and try again.");
        return;
      }
    }

    const { data, error } = await startReveal(hangoutId, sessionToken);

    if (error || !data) {
      finishingRevealRef.current = false;
      setStarting(false);
      setCountdownStartedAt(null);
      setStartError(error ?? "Could not start reveal");
      return;
    }

    onHangoutUpdate(data);
    setStarting(false);
  }, [hangoutId, onHangoutUpdate, sessionToken]);

  const { displaySeconds } = useRevealCountdown(countdownStartedAt, {
    enabled: isFilmKeeper && hangout.status === "developing",
    countdownMs,
    onComplete: handleCountdownComplete,
  });

  const handleBeginCountdown = useCallback(async () => {
    if (countdownActive) return;

    setStartError(null);
    setSignaling(true);

    const { data, error } = await signalRevealPending(hangoutId, sessionToken);

    setSignaling(false);

    if (error || !data) {
      setStartError(error ?? "Could not start reveal");
      return;
    }

    onHangoutUpdate(data);
    preloadRevealAmbientAudio();
    void unlockRevealAmbientAudioForAutoplay();
    setCountdownStartedAt(Date.now());
  }, [
    countdownActive,
    hangoutId,
    onHangoutUpdate,
    sessionToken,
  ]);

  const guestFooterHint = revealStarting
    ? "Reveal starting…"
    : "Waiting for the Film Keeper to start the reveal…";

  useEffect(() => {
    onFooterChange({
      hint: isFilmKeeper ? undefined : guestFooterHint,
      children: isFilmKeeper ? (
        <>
          {startError && (
            <p className="text-center text-sm text-pink">{startError}</p>
          )}
          <Button
            type="button"
            disabled={starting || signaling || countdownActive}
            className={APP_PRIMARY_BUTTON_CLASS}
            onClick={() => void handleBeginCountdown()}
          >
            {countdownActive
              ? "Revealing…"
              : signaling
                ? "Starting…"
                : starting
                  ? "Opening reveal…"
                  : "Start reveal"}
          </Button>
        </>
      ) : null,
    });
  }, [
    countdownActive,
    guestFooterHint,
    handleBeginCountdown,
    isFilmKeeper,
    onFooterChange,
    signaling,
    startError,
    starting,
  ]);

  return (
    <>
      {displaySeconds !== null ? (
        <RevealCountdownOverlay seconds={displaySeconds} />
      ) : null}

      <DevelopingOverlayPanel
        revealStarting={revealStarting}
        isFilmKeeper={isFilmKeeper}
        prepare={prepare}
      />
    </>
  );
}
