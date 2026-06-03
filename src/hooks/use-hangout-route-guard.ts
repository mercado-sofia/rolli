"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  getHangoutRouteRedirect,
  normalizeHangoutPath,
} from "@/lib/hangout/routes";
import { useSessionStore } from "@/store/session-store";
import type { Hangout } from "@/types/hangout";

type UseHangoutRouteGuardOptions = {
  slug: string;
  hangout: Hangout | null;
  isLoading: boolean;
  /**
   * Only enforce redirects while the URL ends with this segment (e.g. `/guessing`).
   * Prevents a stale guard on the previous page from cancelling client navigation.
   */
  guardPathSuffix?: string;
};

export function useHangoutRouteGuard({
  slug,
  hangout,
  isLoading,
  guardPathSuffix,
}: UseHangoutRouteGuardOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const leavingApp = useSessionStore((state) => state.leavingApp);
  const participant = useSessionStore((state) => state.participant);

  useEffect(() => {
    if (isLoading || leavingApp || !hangout || hangout.slug !== slug) return;

    const path = normalizeHangoutPath(pathname);
    if (guardPathSuffix && !path.endsWith(guardPathSuffix)) {
      return;
    }

    const redirectTo = getHangoutRouteRedirect(slug, path, hangout.status, {
      revealFinishedAt: participant?.revealFinishedAt,
    });

    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [
    guardPathSuffix,
    hangout,
    isLoading,
    leavingApp,
    participant?.revealFinishedAt,
    pathname,
    router,
    slug,
  ]);
}
