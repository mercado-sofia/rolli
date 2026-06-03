"use client";

import { useEffect, useState } from "react";

import { useSessionStore } from "@/store/session-store";

export function useSessionHydrated(): boolean {
  const [hydrated, setHydrated] = useState(
    () => useSessionStore.persist.hasHydrated(),
  );

  useEffect(() => {
    if (hydrated) {
      return;
    }

    return useSessionStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
  }, [hydrated]);

  return hydrated;
}
