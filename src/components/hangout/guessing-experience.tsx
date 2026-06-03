"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LuImages } from "react-icons/lu";

import { GuessingTargetNickname } from "@/components/hangout/guessing-target-nickname";
import { PerspectivePhotosOverlay } from "@/components/hangout/perspective-photos-overlay";
import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MobileLoadingSpinner } from "@/components/ui/mobile-loading-spinner";
import { cn } from "@/lib/utils";
import { HANGOUT_LIMITS } from "@/lib/constants";
import {
  finishGuessing,
  getGuessingResults,
  getGuessingState,
  submitVote,
  getRevealState,
  signRevealPhotoUrls,
} from "@/lib/hangout/hangout-api";
import type { Hangout } from "@/types/hangout";
import type { HangoutStatus } from "@/types/hangout";
import type { GuessingResults, GuessingState, GuessingTarget } from "@/types/guessing";
import type { RevealPerspective } from "@/types/reveal";

export type SetupFlowFooterState = {
  hint?: string;
  children?: ReactNode;
  /** True only when the server returned results (hangout is really completed). */
  showGalleryButton?: boolean;
};

type GuessingExperienceProps = {
  hangoutId: string;
  sessionToken: string;
  hangoutStatus: HangoutStatus;
  canAccessGuessing: boolean;
  onHangoutCompleted: (hangout?: Hangout) => void;
  onFooterChange?: (footer: SetupFlowFooterState) => void;
};

export function GuessingExperience({
  hangoutId,
  sessionToken,
  hangoutStatus,
  canAccessGuessing,
  onHangoutCompleted,
  onFooterChange,
}: GuessingExperienceProps) {
  const [state, setState] = useState<GuessingState | null>(null);
  const [results, setResults] = useState<GuessingResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [savingTargetId, setSavingTargetId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [galleryTarget, setGalleryTarget] = useState<GuessingTarget | null>(null);
  const [perspectivePhotos, setPerspectivePhotos] = useState<RevealPerspective[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosLoadError, setPhotosLoadError] = useState<string | null>(null);
  const [loadedPerspectivePhotosKey, setLoadedPerspectivePhotosKey] = useState<
    string | null
  >(null);
  const onHangoutCompletedRef = useRef(onHangoutCompleted);
  const photosResetKey = `${hangoutId}:${reloadKey}`;
  const [trackedPhotosResetKey, setTrackedPhotosResetKey] = useState(photosResetKey);

  if (trackedPhotosResetKey !== photosResetKey) {
    setTrackedPhotosResetKey(photosResetKey);
    setLoadedPerspectivePhotosKey(null);
    setPerspectivePhotos([]);
    setPhotosLoadError(null);
    setPhotosLoading(false);
  }

  useEffect(() => {
    onHangoutCompletedRef.current = onHangoutCompleted;
  }, [onHangoutCompleted]);

  const isCompleted = hangoutStatus === "completed";

  const retryLoad = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!canAccessGuessing) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoadError(null);
      setLoading(true);

      if (isCompleted) {
        const { data, error } = await getGuessingResults(hangoutId, sessionToken);
        if (cancelled) return;

        if (error || !data) {
          setResults(null);
          setLoadError(error ?? "Could not load results");
          setLoading(false);
          return;
        }

        setResults(data);
        setState(null);
        setLoading(false);
        return;
      }

      const { data, error } = await getGuessingState(hangoutId, sessionToken);
      if (cancelled) return;

      if (error || !data) {
        setState(null);
        setLoadError(error ?? "Could not load guessing");
        setLoading(false);
        return;
      }

      setResults(null);
      setState(data.state);
      if (data.hangout?.status === "completed") {
        onHangoutCompletedRef.current(data.hangout);
      }
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [canAccessGuessing, hangoutId, isCompleted, reloadKey, sessionToken]);

  const canLoadPerspectivePhotos = !isCompleted && !loading && state !== null;

  useEffect(() => {
    if (!galleryTarget || !canLoadPerspectivePhotos) {
      return;
    }

    if (loadedPerspectivePhotosKey === photosResetKey) {
      return;
    }

    let cancelled = false;

    async function loadPerspectivePhotos() {
      setPhotosLoading(true);
      setPhotosLoadError(null);

      try {
        const { data, error } = await getRevealState(hangoutId, sessionToken);
        if (cancelled) return;

        if (error || !data) {
          setPerspectivePhotos([]);
          setPhotosLoadError(error ?? "Could not load photos");
          return;
        }

        const signed = await signRevealPhotoUrls(data.perspectives);
        if (cancelled) return;

        setLoadedPerspectivePhotosKey(photosResetKey);
        setPerspectivePhotos(signed);
      } finally {
        if (!cancelled) {
          setPhotosLoading(false);
        }
      }
    }

    void loadPerspectivePhotos();

    return () => {
      cancelled = true;
      setPhotosLoading(false);
    };
  }, [
    canLoadPerspectivePhotos,
    galleryTarget,
    hangoutId,
    loadedPerspectivePhotosKey,
    photosResetKey,
    sessionToken,
  ]);

  const galleryPhotos = useMemo(() => {
    if (!galleryTarget) return [];
    return (
      perspectivePhotos.find(
        (perspective) => perspective.participantId === galleryTarget.participantId,
      )?.photos ?? []
    );
  }, [galleryTarget, perspectivePhotos]);

  useEffect(() => {
    if (isCompleted || !canAccessGuessing) {
      return;
    }

    let cancelled = false;

    async function poll() {
      const { data, error } = await getGuessingState(hangoutId, sessionToken);
      if (cancelled || error || !data) return;
      setState(data.state);
      if (data.hangout?.status === "completed") {
        onHangoutCompletedRef.current(data.hangout);
      }
    }

    const intervalId = window.setInterval(() => {
      void poll();
    }, HANGOUT_LIMITS.hangoutPollMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [canAccessGuessing, hangoutId, hangoutStatus, isCompleted, sessionToken]);

  const myVotesIn = (state?.votesSubmitted ?? 0) >= (state?.votesRequired ?? 0);
  const allParticipantsVoted = state?.allParticipantsVoted ?? false;

  const votesByTarget = useMemo(() => {
    const map = new Map<string, string>();
    state?.myVotes.forEach((vote) => {
      map.set(vote.targetParticipantId, vote.guessedRealName);
    });
    return map;
  }, [state?.myVotes]);

  const usedNames = useMemo(() => {
    return new Set(votesByTarget.values());
  }, [votesByTarget]);

  const completingRef = useRef(false);

  const handleFinishGuessing = useCallback(async () => {
    setFinishing(true);
    setFinishError(null);

    const { data, error } = await finishGuessing(hangoutId, sessionToken);

    setFinishing(false);

    if (data) {
      onHangoutCompletedRef.current(data);
      return;
    }

    if (error?.includes("not in the guessing phase")) {
      onHangoutCompletedRef.current();
      return;
    }

    if (error) {
      setFinishError(error);
      completingRef.current = false;
    }
  }, [hangoutId, sessionToken]);

  useEffect(() => {
    if (
      isCompleted ||
      !allParticipantsVoted ||
      loading ||
      !state ||
      completingRef.current
    ) {
      return;
    }

    completingRef.current = true;
    void handleFinishGuessing();
  }, [allParticipantsVoted, handleFinishGuessing, isCompleted, loading, state]);

  async function handleGuess(
    targetParticipantId: string,
    guessedRealName: string,
  ) {
    setSavingTargetId(targetParticipantId);
    setSubmitError(null);

    const { data, error } = await submitVote(
      hangoutId,
      sessionToken,
      targetParticipantId,
      guessedRealName,
    );

    setSavingTargetId(null);

    if (error || !data) {
      setSubmitError(error ?? "Could not save guess");
      return;
    }

    setState(data.state);
    if (data.hangout?.status === "completed") {
      onHangoutCompletedRef.current(data.hangout);
    }
  }

  useEffect(() => {
    if (!onFooterChange || loading || loadError) {
      onFooterChange?.({});
      return;
    }

    if (isCompleted && loadError) {
      onFooterChange({
        hint: "Results are not ready yet. Try refreshing this page.",
        showGalleryButton: true,
      });
      return;
    }

    if (isCompleted && results) {
      onFooterChange({
        hint: "Browse every perspective in the memory gallery.",
        showGalleryButton: true,
      });
      return;
    }

    if (isCompleted) {
      onFooterChange({
        hint: "Loading results…",
        showGalleryButton: true,
      });
      return;
    }

    if (!state) {
      onFooterChange({});
      return;
    }

    if (myVotesIn && !allParticipantsVoted) {
      onFooterChange({
        hint: "Your guesses are saved. Waiting for everyone else to finish…",
      });
      return;
    }

    if (allParticipantsVoted) {
      onFooterChange({
        hint: finishing
          ? "Finalizing results…"
          : "Everyone has guessed — opening results…",
        children: finishError ? (
          <p className="text-center text-sm text-pink">{finishError}</p>
        ) : undefined,
      });
      return;
    }

    onFooterChange({
      hint: "Match each nickname to a real name. Your guesses stay private.",
    });
  }, [
    allParticipantsVoted,
    finishError,
    finishing,
    isCompleted,
    loadError,
    loading,
    myVotesIn,
    onFooterChange,
    results,
    state,
  ]);

  if (loading) {
    return <MobileLoadingSpinner inline className="py-8" />;
  }

  if (loadError) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-pink">{loadError}</p>
        <Button type="button" variant="secondary" onClick={retryLoad}>
          Try again
        </Button>
      </div>
    );
  }

  if (isCompleted) {
    if (!results) {
      return (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted">Results are not available yet.</p>
          <Button type="button" variant="secondary" onClick={retryLoad}>
            Refresh
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6 pt-5 sm:pt-8">
        <Card border="neutral" className="text-center">
          <p className="text-sm text-muted">Your score</p>
          <p className="font-display mt-1 text-3xl">
            {results.myScore.correct}/{results.myScore.total}
          </p>
          <p className="mt-2 text-sm text-muted">
            You matched {results.myScore.correct} of {results.myScore.total}{" "}
            perspectives correctly.
          </p>
        </Card>

        <div className="space-y-3">
          {results.revealed.map((row) => (
            <Card key={row.participantId} border="neutral">
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm sm:justify-between sm:text-left">
                <span className="font-medium wrap-break-word text-pink-highlight">
                  {row.nickname}
                </span>
                <span className="text-muted">was</span>
                <span className="font-medium wrap-break-word text-ink">
                  {row.realName}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted">Could not load the guessing round.</p>
        <Button type="button" variant="secondary" onClick={retryLoad}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="min-w-0 space-y-6 pt-5 sm:pt-8">
        {submitError && (
          <p className="text-center text-sm text-pink">{submitError}</p>
        )}

        <Card border="neutral" className="p-4 sm:p-5">
          <ul className="divide-y divide-container-border/70">
            {state.targets.map((target) => {
              const selected = votesByTarget.get(target.participantId) ?? "";
              const isSaving = savingTargetId === target.participantId;

              const selectOptions = state.realNameOptions.map((name) => ({
                value: name,
                label: name,
                disabled: usedNames.has(name) && selected !== name,
              }));

              return (
                <li
                  key={target.participantId}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 py-4 first:pt-0 last:pb-0 sm:gap-x-3"
                >
                  <div className="flex min-w-0 self-stretch items-center justify-start gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setGalleryTarget(target)}
                      className={cn(
                        "shrink-0 rounded-md p-1 text-pink-highlight transition-colors",
                        "hover:bg-pink/10 hover:text-pink-accent active:scale-95",
                      )}
                      aria-label={`View photos from ${target.nickname}`}
                    >
                      <LuImages className="h-4.5 w-4.5 sm:h-5 sm:w-5" aria-hidden />
                    </button>
                    <GuessingTargetNickname
                      nickname={target.nickname}
                      className="min-w-0 flex-1"
                    />
                  </div>
                  <AppSelect
                    className="w-36 shrink-0 justify-self-end sm:w-40"
                    value={selected}
                    placeholder="Guess"
                    disabled={isSaving}
                    aria-label={`Real name for ${target.nickname}`}
                    options={selectOptions}
                    onChange={(name) => void handleGuess(target.participantId, name)}
                  />
                </li>
              );
            })}
          </ul>
        </Card>

      {state.targets.length === 0 && (
        <Card border="neutral" className="text-center text-sm text-muted">
          No other participants to guess — you&apos;re solo in this hangout.
        </Card>
      )}

      {myVotesIn && !allParticipantsVoted && (
        <Card border="neutral" className="text-center md:hidden">
          <p className="text-sm text-muted">
            Your guesses are saved. Waiting for everyone else to finish…
          </p>
        </Card>
      )}

      </div>

      <PerspectivePhotosOverlay
        open={galleryTarget !== null}
        onClose={() => setGalleryTarget(null)}
        nickname={galleryTarget?.nickname ?? ""}
        photos={galleryPhotos}
        loading={galleryTarget !== null && photosLoading}
        loadError={photosLoadError}
      />
    </>
  );
}
