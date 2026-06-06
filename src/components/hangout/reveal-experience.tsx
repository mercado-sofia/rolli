"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { RevealPhotoCarousel } from "@/components/hangout/reveal-photo-carousel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MobileLoadingSpinner } from "@/components/ui/mobile-loading-spinner";
import { useResignPhotosOnVisibility } from "@/hooks/use-resign-photos-on-visibility";
import { APP_PRIMARY_BUTTON_CLASS } from "@/lib/app-page-layout";
import {
  getRevealState,
  markReadyForGuessing,
  signRevealPhotoUrls,
} from "@/lib/hangout/hangout-api";
import {
  clearRevealPreload,
  getRevealPreload,
  isRevealPreloadUsable,
} from "@/lib/hangout/reveal-preload";
import type { Hangout } from "@/types/hangout";
import type { Participant } from "@/types/participant";
import type {
  MarkReadyForGuessingResult,
  RevealPerspective,
} from "@/types/reveal";

function readUsableRevealPreload(hangoutId: string) {
  const cached = getRevealPreload(hangoutId);
  return isRevealPreloadUsable(cached) ? cached : null;
}

export type SetupFlowFooterState = {
  hint?: string;
  children?: ReactNode;
};

type RevealExperienceProps = {
  hangoutId: string;
  sessionToken: string;
  alreadyReadyForGuessing?: boolean;
  onMarkReadyForGuessing: (result: MarkReadyForGuessingResult) => void;
  onProceedToGuessing?: () => void;
  onSessionSync?: (payload: {
    hangout?: Hangout;
    participant?: Participant;
  }) => void;
  onFooterChange?: (footer: SetupFlowFooterState) => void;
  /** When false, reveal UI still loads but footer actions stay hidden (developing overlay). */
  footerEnabled?: boolean;
  /** Re-run cache hydration when developing preload completes. */
  prepareReady?: boolean;
};

export function RevealExperience({
  hangoutId,
  sessionToken,
  alreadyReadyForGuessing = false,
  onMarkReadyForGuessing,
  onProceedToGuessing,
  onSessionSync,
  onFooterChange,
  footerEnabled = true,
  prepareReady = false,
}: RevealExperienceProps) {
  const usablePreload = readUsableRevealPreload(hangoutId);
  const [perspectives, setPerspectives] = useState<RevealPerspective[]>(
    usablePreload?.perspectives ?? [],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(!usablePreload);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [signedAt, setSignedAt] = useState<number | null>(
    usablePreload?.signedAt ?? null,
  );
  const [continuingToGuessing, setContinuingToGuessing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const retryLoad = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const syncSessionFromRevealState = useCallback(
    (payload: { hangout?: Hangout; participant?: Participant }) => {
      if (payload.hangout || payload.participant) {
        onSessionSync?.(payload);
      }
    },
    [onSessionSync],
  );

  const resignPhotos = useCallback(async () => {
    const { data, error } = await getRevealState(hangoutId, sessionToken);
    if (error || !data) return;

    try {
      const signed = await signRevealPhotoUrls(data.perspectives);
      setPerspectives(signed);
      setSignedAt(Date.now());
      syncSessionFromRevealState({
        hangout: data.hangout,
        participant: data.participant,
      });
    } catch {
      setLoadError("Could not refresh reveal photos");
    }
  }, [hangoutId, sessionToken, syncSessionFromRevealState]);

  useResignPhotosOnVisibility({
    signedAt,
    onResign: resignPhotos,
    enabled: !loading && perspectives.length > 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (reloadKey === 0 || prepareReady) {
        const cached = readUsableRevealPreload(hangoutId);
        if (cached) {
          if (cancelled) return;

          setPerspectives(cached.perspectives);
          setSignedAt(cached.signedAt);
          setLoadError(null);
          setLoading(false);
          return;
        }
      }

      if (reloadKey === 0) {
        const stale = getRevealPreload(hangoutId);
        if (stale) {
          clearRevealPreload(hangoutId);
        }
      }

      setLoadError(null);
      setLoading(true);

      const { data, error } = await getRevealState(hangoutId, sessionToken);
      if (cancelled) return;

      if (error || !data) {
        setPerspectives([]);
        setCurrentIndex(0);
        setSignedAt(null);
        setLoadError(error ?? "Could not load reveal");
        setLoading(false);
        return;
      }

      try {
        const signed = await signRevealPhotoUrls(data.perspectives);
        if (cancelled) return;

        setPerspectives(signed);
        setCurrentIndex(0);
        setSignedAt(Date.now());
        syncSessionFromRevealState({
          hangout: data.hangout,
          participant: data.participant,
        });
      } catch {
        if (cancelled) return;
        setPerspectives([]);
        setCurrentIndex(0);
        setSignedAt(null);
        setLoadError("Could not load reveal photos");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    hangoutId,
    prepareReady,
    reloadKey,
    sessionToken,
    syncSessionFromRevealState,
  ]);

  const current = perspectives[currentIndex];
  const isLastPerspective = currentIndex >= perspectives.length - 1;
  const totalPhotos = perspectives.reduce(
    (sum, perspective) => sum + perspective.photos.length,
    0,
  );

  const goToNextPerspective = useCallback(() => {
    if (!isLastPerspective) {
      setCurrentIndex((index) => index + 1);
    }
  }, [isLastPerspective]);

  const handleMarkReadyForGuessing = useCallback(async () => {
    setContinuingToGuessing(true);
    setFinishError(null);

    const { data, error } = await markReadyForGuessing(hangoutId, sessionToken);

    if (error || !data) {
      setContinuingToGuessing(false);
      setFinishError(error ?? "Could not continue to guessing");
      return;
    }

    onMarkReadyForGuessing(data);
  }, [hangoutId, onMarkReadyForGuessing, sessionToken]);

  const handleContinueToGuessing = useCallback(() => {
    if (continuingToGuessing) {
      return;
    }

    if (alreadyReadyForGuessing) {
      setContinuingToGuessing(true);
      setFinishError(null);
      onProceedToGuessing?.();
      return;
    }

    void handleMarkReadyForGuessing();
  }, [
    alreadyReadyForGuessing,
    continuingToGuessing,
    handleMarkReadyForGuessing,
    onProceedToGuessing,
  ]);

  const continueToGuessingFooter = useCallback(
    (): SetupFlowFooterState => ({
      children: (
        <>
          {finishError && (
            <p className="text-center text-sm text-pink">{finishError}</p>
          )}
          <Button
            type="button"
            className={APP_PRIMARY_BUTTON_CLASS}
            disabled={continuingToGuessing}
            onClick={handleContinueToGuessing}
          >
            {continuingToGuessing
              ? "Continuing to guessing…"
              : "Continue to guessing"}
          </Button>
        </>
      ),
    }),
    [
      continuingToGuessing,
      finishError,
      handleContinueToGuessing,
    ],
  );

  useEffect(() => {
    if (!footerEnabled || !onFooterChange || loading || loadError) {
      onFooterChange?.({});
      return;
    }

    if (perspectives.length === 0 || totalPhotos === 0) {
      onFooterChange(continueToGuessingFooter());
      return;
    }

    if (!isLastPerspective) {
      onFooterChange({
        children: (
          <Button
            type="button"
            className={APP_PRIMARY_BUTTON_CLASS}
            onClick={goToNextPerspective}
          >
            Next perspective
          </Button>
        ),
      });
      return;
    }

    onFooterChange(continueToGuessingFooter());
  }, [
    continueToGuessingFooter,
    footerEnabled,
    isLastPerspective,
    loadError,
    loading,
    onFooterChange,
    perspectives.length,
    totalPhotos,
    goToNextPerspective,
  ]);

  if (loading) {
    return <MobileLoadingSpinner inline className="py-8" />;
  }

  if (loadError) {
    return (
      <div className="w-full space-y-4 text-center">
        <p className="text-sm text-pink">{loadError}</p>
        <Button type="button" variant="secondary" onClick={retryLoad}>
          Try again
        </Button>
      </div>
    );
  }

  if (perspectives.length === 0 || totalPhotos === 0) {
    return (
      <Card border="neutral" className="w-full text-center">
        <p className="text-sm text-muted">
          No memories were captured in this hangout.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex w-full flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.participantId}
            initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="flex w-full flex-col items-stretch gap-4 sm:gap-5"
          >
            <p className="truncate px-1 text-center text-sm leading-snug">
              <span className="font-medium text-ink">Anonymous</span>
              <span className="mx-1.5 text-muted" aria-hidden>
                ·
              </span>
              <span className="font-display text-lg text-pink-highlight">
                {current.nickname}
              </span>
            </p>

            {current.photos.length > 0 ? (
              <div className="w-full min-w-0">
                <RevealPhotoCarousel
                  key={current.participantId}
                  photos={current.photos}
                  perspectiveLabel={current.nickname}
                />
              </div>
            ) : null}

            {current.photos.length === 0 && (
              <p className="px-4 text-center text-sm text-muted">
                No photos from this perspective.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
