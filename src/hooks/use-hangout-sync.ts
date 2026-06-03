"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { HANGOUT_LIMITS } from "@/lib/constants";
import { fetchHangoutBySlug } from "@/lib/hangout/hangout-api";
import { mergeHangoutUpdate } from "@/lib/hangout/hangout-sync";
import { createClient } from "@/lib/supabase/client";
import { mapHangout, type HangoutRowJson } from "@/lib/supabase/mappers";
import { useSessionStore } from "@/store/session-store";
import type { Hangout } from "@/types/hangout";

const POLL_MS = HANGOUT_LIMITS.hangoutPollMs;

type UseHangoutSyncOptions = {
  slug: string;
  enabled?: boolean;
};

export function useHangoutSync({ slug, enabled = true }: UseHangoutSyncOptions) {
  const setHangout = useSessionStore((state) => state.setHangout);
  const sessionHangout = useSessionStore((state) => state.hangout);

  const [hangout, setLocalHangout] = useState<Hangout | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => {
    setLoadError(null);
    setIsLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  const syncedHangout = useMemo(() => {
    if (!enabled || sessionHangout?.slug !== slug) return hangout;
    if (!hangout) return sessionHangout;
    return mergeHangoutUpdate(sessionHangout, hangout);
  }, [enabled, hangout, sessionHangout, slug]);

  useEffect(() => {
    if (!enabled || !slug) return;

    let cancelled = false;
    let pollIntervalId: number | undefined;
    let removeChannel: (() => void) | undefined;

    function applyHangout(data: Hangout) {
      if (cancelled) return;

      const { hangout: current, participant } = useSessionStore.getState();
      const merged = mergeHangoutUpdate(current, data);

      setLocalHangout(merged);
      if (participant && participant.hangoutId === data.id) {
        setHangout(merged);
      }
      setLoadError(null);
      setIsLoading(false);
    }

    async function load(): Promise<Hangout | null> {
      const { data, error } = await fetchHangoutBySlug(slug);
      if (cancelled) return null;

      if (error) {
        setLoadError(error);
        setIsLoading(false);
        return null;
      }

      if (!data) {
        setLoadError("Hangout not found");
        setIsLoading(false);
        return null;
      }

      applyHangout(data);
      return data;
    }

    async function setup() {
      const initial = await load();
      if (cancelled) return;

      pollIntervalId = window.setInterval(() => {
        void load();
      }, POLL_MS);

      if (!initial) return;

      const supabase = createClient();
      const channel = supabase
        .channel(`hangout-status:${initial.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "hangouts",
            filter: `id=eq.${initial.id}`,
          },
          (payload) => {
            const row = payload.new as HangoutRowJson;
            if (row.slug !== slug) return;
            applyHangout(mapHangout(row));
          },
        )
        .subscribe();

      removeChannel = () => {
        void supabase.removeChannel(channel);
      };
    }

    void setup();

    return () => {
      cancelled = true;
      if (pollIntervalId) {
        window.clearInterval(pollIntervalId);
      }
      removeChannel?.();
    };
  }, [enabled, reloadKey, setHangout, slug]);

  return { hangout: syncedHangout, loadError, isLoading, retry };
}
