"use client";

import { useCallback, useEffect, useState } from "react";

import { HANGOUT_LIMITS } from "@/lib/constants";
import { getHangoutParticipants } from "@/lib/hangout/hangout-api";
import type { HangoutRosterParticipant } from "@/types/hangout-roster";

type UseHangoutRosterOptions = {
  hangoutId: string;
  sessionToken: string;
  enabled: boolean;
};

export function useHangoutRoster({
  hangoutId,
  sessionToken,
  enabled,
}: UseHangoutRosterOptions) {
  const [participants, setParticipants] = useState<HangoutRosterParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!hangoutId || !sessionToken) {
      return undefined;
    }

    const { data, error: fetchError } = await getHangoutParticipants(
      hangoutId,
      sessionToken,
    );

    if (fetchError || !data) {
      setError(fetchError ?? "Could not load participants");
      return undefined;
    }

    setError(null);
    setParticipants(data.participants);
    return data;
  }, [hangoutId, sessionToken]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    async function load(showLoading: boolean) {
      if (showLoading) {
        setLoading(true);
        setError(null);
      }

      const { data, error: fetchError } = await getHangoutParticipants(
        hangoutId,
        sessionToken,
      );

      if (cancelled) return;

      if (fetchError || !data) {
        if (showLoading) {
          setError(fetchError ?? "Could not load participants");
        }
      } else {
        setError(null);
        setParticipants(data.participants);
      }

      if (showLoading) {
        setLoading(false);
      }
    }

    void load(true);

    const intervalId = window.setInterval(() => {
      void load(false);
    }, HANGOUT_LIMITS.hangoutPollMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [enabled, hangoutId, sessionToken]);

  return {
    participants,
    loading,
    error,
    refresh,
  };
}
