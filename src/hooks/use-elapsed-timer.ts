"use client";

import { useEffect, useReducer } from "react";

function getElapsedMs(startedAt: string | null | undefined): number {
  if (!startedAt) return 0;

  const startMs = new Date(startedAt).getTime();
  if (Number.isNaN(startMs)) return 0;

  return Math.max(0, Date.now() - startMs);
}

export function useElapsedTimer(startedAt: string | null | undefined) {
  const [, tick] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    if (!startedAt) return;

    const startMs = new Date(startedAt).getTime();
    if (Number.isNaN(startMs)) return;

    const intervalId = window.setInterval(() => {
      tick();
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [startedAt]);

  void tick;

  return getElapsedMs(startedAt);
}
