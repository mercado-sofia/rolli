"use client";

import { useSyncExternalStore } from "react";

const TOUCH_PRIMARY_QUERY = "(pointer: coarse)";

function subscribeToTouchPrimary(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(TOUCH_PRIMARY_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getTouchPrimarySnapshot() {
  return window.matchMedia(TOUCH_PRIMARY_QUERY).matches;
}

function getTouchPrimaryServerSnapshot() {
  return true;
}

export function useTouchPrimary() {
  return useSyncExternalStore(
    subscribeToTouchPrimary,
    getTouchPrimarySnapshot,
    getTouchPrimaryServerSnapshot,
  );
}
