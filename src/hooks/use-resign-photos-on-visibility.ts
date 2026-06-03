"use client";

import { useEffect } from "react";

import { SIGNED_URL_REFRESH_MS } from "@/lib/hangout/signed-photo-urls";

type UseResignPhotosOnVisibilityOptions = {
  signedAt: number | null;
  onResign: () => void | Promise<void>;
  enabled?: boolean;
};

export function useResignPhotosOnVisibility({
  signedAt,
  onResign,
  enabled = true,
}: UseResignPhotosOnVisibilityOptions) {
  useEffect(() => {
    if (!enabled) return;

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      if (signedAt === null) return;
      if (Date.now() - signedAt < SIGNED_URL_REFRESH_MS) return;
      void onResign();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, onResign, signedAt]);
}
