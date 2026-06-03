"use client";

import { useEffect, useRef, useState } from "react";

import type { Hangout } from "@/types/hangout";
import type { Participant } from "@/types/participant";

const PROMOTION_DISMISS_MS = 6000;

type UseFilmKeeperPromotionOptions = {
  participant: Participant | null;
  hangout: Hangout | null;
};

export function useFilmKeeperPromotion({
  participant,
  hangout,
}: UseFilmKeeperPromotionOptions) {
  const prevFilmKeeperIdRef = useRef<string | null>(null);
  const hasSyncedRef = useRef(false);
  const [showPromotion, setShowPromotion] = useState(false);

  useEffect(() => {
    if (!participant || !hangout) return;

    const keeperId = hangout.filmKeeperId;
    const becameKeeper =
      participant.id === keeperId &&
      hasSyncedRef.current &&
      prevFilmKeeperIdRef.current !== null &&
      prevFilmKeeperIdRef.current !== participant.id;

    if (becameKeeper) {
      setShowPromotion(true);
    }

    prevFilmKeeperIdRef.current = keeperId;
    hasSyncedRef.current = true;
  }, [participant, hangout]);

  useEffect(() => {
    if (!showPromotion) return;

    const timeoutId = window.setTimeout(() => {
      setShowPromotion(false);
    }, PROMOTION_DISMISS_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showPromotion]);

  function dismissPromotion() {
    setShowPromotion(false);
  }

  return { showPromotion, dismissPromotion };
}
