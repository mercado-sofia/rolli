"use client";

import { useSessionStore } from "@/store/session-store";

/** True when the user still has an active persisted session for this hangout slug. */
export function useInHangoutSession(slug: string): boolean {
  const participant = useSessionStore((state) => state.participant);
  const sessionHangout = useSessionStore((state) => state.hangout);
  const kickedFromSlug = useSessionStore((state) => state.kickedFromSlug);

  if (kickedFromSlug === slug) {
    return false;
  }

  return Boolean(
    participant?.sessionToken &&
      sessionHangout?.slug === slug &&
      sessionHangout.id &&
      participant.hangoutId === sessionHangout.id,
  );
}
