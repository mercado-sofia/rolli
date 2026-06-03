"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSessionHydrated } from "@/hooks/use-session-hydrated";
import { isHangoutSessionValid } from "@/lib/hangout/participant";
import { useSessionStore } from "@/store/session-store";
import type { Hangout } from "@/types/hangout";

type UseHangoutSessionGuardOptions = {
  slug: string;
  hangout: Hangout | null;
  isLoading: boolean;
};

export function useHangoutSessionGuard({
  slug,
  hangout,
  isLoading,
}: UseHangoutSessionGuardOptions) {
  const router = useRouter();
  const sessionHydrated = useSessionHydrated();
  const participant = useSessionStore((state) => state.participant);
  const sessionHangout = useSessionStore((state) => state.hangout);
  const leavingApp = useSessionStore((state) => state.leavingApp);
  const kickedFromSlug = useSessionStore((state) => state.kickedFromSlug);

  useEffect(() => {
    if (!sessionHydrated || isLoading || leavingApp || kickedFromSlug === slug) {
      return;
    }

    if (!isHangoutSessionValid(slug, hangout, participant, sessionHangout)) {
      router.replace(`/h/${slug}`);
    }
  }, [
    hangout,
    isLoading,
    kickedFromSlug,
    leavingApp,
    participant,
    router,
    sessionHangout,
    sessionHydrated,
    slug,
  ]);

  const hasValidSession =
    sessionHydrated &&
    isHangoutSessionValid(slug, hangout, participant, sessionHangout);

  return {
    participant: hasValidSession ? participant : null,
    hasValidSession,
  };
}
