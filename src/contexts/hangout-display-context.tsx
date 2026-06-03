"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { useHangoutSync } from "@/hooks/use-hangout-sync";
import { useHangoutSyncEnabled } from "@/hooks/use-hangout-sync-enabled";
import { mergeHangoutUpdate } from "@/lib/hangout/hangout-sync";
import { useSessionStore } from "@/store/session-store";
import type { Hangout } from "@/types/hangout";

type HangoutDisplayContextValue = {
  displayHangout: Hangout | null;
  loadError: string | null;
  isLoading: boolean;
  retry: () => void;
};

const HangoutDisplayContext = createContext<HangoutDisplayContextValue | null>(
  null,
);

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

type HangoutDisplayProviderProps = {
  slug: string;
  children: ReactNode;
};

/** One realtime subscription per hangout route — shared by layout and pages. */
export function HangoutDisplayProvider({
  slug,
  children,
}: HangoutDisplayProviderProps) {
  const hangoutStore = useSessionStore((state) => state.hangout);
  const syncEnabled = useHangoutSyncEnabled(slug);
  const { hangout: syncedHangout, loadError, isLoading, retry } = useHangoutSync({
    slug,
    enabled: syncEnabled,
  });

  const value = useMemo(
    (): HangoutDisplayContextValue => ({
      displayHangout: mergeDisplayHangout(slug, syncedHangout, hangoutStore),
      loadError,
      isLoading,
      retry,
    }),
    [hangoutStore, isLoading, loadError, retry, slug, syncedHangout],
  );

  return (
    <HangoutDisplayContext.Provider value={value}>
      {children}
    </HangoutDisplayContext.Provider>
  );
}

/** Merges live sync with the persisted session hangout for hangout flow pages. */
export function useDisplayHangout(): HangoutDisplayContextValue {
  const context = useContext(HangoutDisplayContext);

  if (!context) {
    throw new Error(
      "useDisplayHangout must be used within HangoutDisplayProvider",
    );
  }

  return context;
}
