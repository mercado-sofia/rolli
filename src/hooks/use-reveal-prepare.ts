"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getRevealPreload,
  isRevealPreloadUsable,
} from "@/lib/hangout/reveal-preload";
import { preloadRevealState } from "@/lib/hangout/reveal-preload";
import type { RevealPerspective } from "@/types/reveal";

export type RevealPrepareStatus = "idle" | "loading" | "ready" | "error";

type UseRevealPrepareOptions = {
  hangoutId: string;
  sessionToken: string;
  enabled?: boolean;
};

function countPhotos(perspectives: RevealPerspective[]): number {
  return perspectives.reduce(
    (sum, perspective) => sum + perspective.photos.length,
    0,
  );
}

function getReadyStats(hangoutId: string) {
  const cached = getRevealPreload(hangoutId);
  if (!isRevealPreloadUsable(cached)) {
    return null;
  }

  return {
    perspectiveCount: cached.perspectives.length,
    photoCount: countPhotos(cached.perspectives),
  };
}

export function useRevealPrepare({
  hangoutId,
  sessionToken,
  enabled = true,
}: UseRevealPrepareOptions) {
  const initialStats = enabled ? getReadyStats(hangoutId) : null;

  const [status, setStatus] = useState<RevealPrepareStatus>(
    initialStats ? "ready" : enabled ? "idle" : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [perspectiveCount, setPerspectiveCount] = useState(
    initialStats?.perspectiveCount ?? 0,
  );
  const [photoCount, setPhotoCount] = useState(initialStats?.photoCount ?? 0);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !hangoutId || !sessionToken) {
      return;
    }

    let cancelled = false;

    async function run() {
      const cached = getRevealPreload(hangoutId);
      if (isRevealPreloadUsable(cached)) {
        setPerspectiveCount(cached.perspectives.length);
        setPhotoCount(countPhotos(cached.perspectives));
        setError(null);
        setStatus("ready");
        return;
      }

      setStatus("loading");
      setError(null);

      const ok = await preloadRevealState(hangoutId, sessionToken);
      if (cancelled) return;

      if (!ok) {
        setStatus("error");
        setError("Could not prepare memories. Check your connection and try again.");
        return;
      }

      const ready = getRevealPreload(hangoutId);
      if (!isRevealPreloadUsable(ready)) {
        setStatus("error");
        setError("Could not prepare photo previews.");
        return;
      }

      setPerspectiveCount(ready.perspectives.length);
      setPhotoCount(countPhotos(ready.perspectives));
      setStatus("ready");
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [enabled, hangoutId, reloadKey, sessionToken]);

  return {
    status,
    error,
    perspectiveCount,
    photoCount,
    isReady: status === "ready",
    retry,
  };
}
