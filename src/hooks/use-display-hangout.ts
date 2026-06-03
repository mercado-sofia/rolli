"use client";

import { useHangoutSync } from "@/hooks/use-hangout-sync";
import { mergeHangoutUpdate } from "@/lib/hangout/hangout-sync";
import { useSessionStore } from "@/store/session-store";
import type { Hangout } from "@/types/hangout";

function mergeDisplayHangout(
  slug: string,
  syncedHangout: Hangout | null,
  hangoutStore: Hangout | null,
): Hangout | null {
  if (!syncedHangout) {
    return hangoutStore?.slug === slug ? hangoutStore : null;
  }

  if (!hangoutStore || hangoutStore.slug !== slug) {
    return syncedHangout;
  }

  return mergeHangoutUpdate(hangoutStore, syncedHangout);
}

/** Merges live sync with the persisted session hangout for hangout flow pages. */
export function useDisplayHangout(slug: string) {
  const hangoutStore = useSessionStore((state) => state.hangout);
  const { hangout: syncedHangout, loadError, isLoading, retry } = useHangoutSync({ slug });

  return {
    displayHangout: mergeDisplayHangout(slug, syncedHangout, hangoutStore),
    loadError,
    isLoading,
    retry,
  };
}
