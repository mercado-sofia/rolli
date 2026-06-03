"use client";

import { useEffect } from "react";

import {
  pauseRevealAmbientAudio,
  playRevealAmbientAudio,
  preloadRevealAmbientAudio,
  unlockRevealAmbientAudioForAutoplay,
} from "@/lib/hangout/reveal-audio";

type RevealAmbientAudioProps = {
  active: boolean;
  /** Preload and unlock during developing so autoplay works once the overlay closes. */
  preparing?: boolean;
};

export function RevealAmbientAudio({
  active,
  preparing = false,
}: RevealAmbientAudioProps) {
  useEffect(() => {
    if (!preparing) return;

    preloadRevealAmbientAudio();

    function handleUnlockInteraction() {
      void unlockRevealAmbientAudioForAutoplay();
    }

    document.addEventListener("pointerdown", handleUnlockInteraction, { once: true });
    document.addEventListener("keydown", handleUnlockInteraction, { once: true });

    return () => {
      document.removeEventListener("pointerdown", handleUnlockInteraction);
      document.removeEventListener("keydown", handleUnlockInteraction);
    };
  }, [preparing]);

  useEffect(() => {
    if (!active) {
      if (!preparing) {
        pauseRevealAmbientAudio();
      }
      return;
    }

    void playRevealAmbientAudio();

    function handleFirstInteraction() {
      void playRevealAmbientAudio();
    }

    document.addEventListener("pointerdown", handleFirstInteraction, { once: true });
    document.addEventListener("keydown", handleFirstInteraction, { once: true });

    function handleVisibilityChange() {
      if (document.hidden) {
        pauseRevealAmbientAudio(false);
        return;
      }

      void playRevealAmbientAudio();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("pointerdown", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [active, preparing]);

  return null;
}
