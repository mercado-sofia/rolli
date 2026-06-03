"use client";

import { useEffect } from "react";

import { useSessionStore } from "@/store/session-store";

/** Resets the post-hangout exit flag once the landing page has mounted. */
export function ClearLeavingAppOnMount() {
  const clearLeavingApp = useSessionStore((state) => state.clearLeavingApp);

  useEffect(() => {
    clearLeavingApp();
  }, [clearLeavingApp]);

  return null;
}
