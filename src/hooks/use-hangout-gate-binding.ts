"use client";

import { useEffect, useState } from "react";

import type { Hangout } from "@/types/hangout";
import type { Participant } from "@/types/participant";

export type HangoutGateBinding = {
  hangoutId: string;
  sessionToken: string;
  hangoutTitle: string;
};

/** Keeps gate credentials after eviction so kicked UI can stay mounted. */
export function useHangoutGateBinding(
  slug: string,
  hangout: Hangout | null | undefined,
  participant: Participant | null | undefined,
): HangoutGateBinding | null {
  const [binding, setBinding] = useState<HangoutGateBinding | null>(null);

  useEffect(() => {
    if (
      hangout?.slug === slug &&
      hangout.id &&
      participant?.sessionToken &&
      participant.hangoutId === hangout.id
    ) {
      const newBinding: HangoutGateBinding = {
        hangoutId: hangout.id,
        sessionToken: participant.sessionToken,
        hangoutTitle: hangout.title,
      };

      let isActive = true;
      Promise.resolve().then(() => {
        if (isActive) {
          setBinding(newBinding);
        }
      });

      return () => {
        isActive = false;
      };
    }

    return undefined;
  }, [slug, hangout, participant]);

  return binding;
}
