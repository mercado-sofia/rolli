"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { HANGOUT_LIMITS } from "@/lib/constants";
import { getParticipantSessionStatus } from "@/lib/hangout/hangout-api";
import { isRemovedByKeeperError } from "@/lib/services/rpc-error";

type UseParticipantSessionStatusOptions = {
  hangoutId: string;
  sessionToken: string;
  enabled: boolean;
};

export function useParticipantSessionStatus({
  hangoutId,
  sessionToken,
  enabled,
}: UseParticipantSessionStatusOptions) {
  const [removedByKeeper, setRemovedByKeeper] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isReady, setIsReady] = useState(!enabled);
  const hasResolvedOnceRef = useRef(false);

  const check = useCallback(async () => {
    if (!hangoutId || !sessionToken) {
      return null;
    }

    const { data, error } = await getParticipantSessionStatus(
      hangoutId,
      sessionToken,
    );

    if (error) {
      if (isRemovedByKeeperError(error)) {
        setRemovedByKeeper(true);
        setIsActive(false);
        return { isActive: false, removedByKeeper: true };
      }
      return null;
    }

    if (data) {
      setRemovedByKeeper(data.removedByKeeper);
      setIsActive(data.isActive);
      return data;
    }

    return null;
  }, [hangoutId, sessionToken]);

  useEffect(() => {
    if (!enabled || removedByKeeper) {
      if (!enabled) {
        Promise.resolve().then(() => setIsReady(true));
      }
      hasResolvedOnceRef.current = false;
      return;
    }

    let cancelled = false;
    hasResolvedOnceRef.current = false;
    Promise.resolve().then(() => setIsReady(false));

    async function runCheck(markReady: boolean) {
      await check();
      if (!cancelled && markReady) {
        hasResolvedOnceRef.current = true;
        setIsReady(true);
      }
    }

    void runCheck(true);

    const intervalId = window.setInterval(() => {
      void check();
    }, HANGOUT_LIMITS.hangoutPollMs);

    function handleVisibilityOrFocus() {
      if (document.visibilityState === "visible") {
        void check();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [check, enabled, removedByKeeper]);

  return {
    removedByKeeper,
    isActive,
    isReady,
    isChecking: enabled && !isReady && !removedByKeeper,
    check,
  };
}
