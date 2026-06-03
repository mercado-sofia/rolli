import { useEffect } from "react";

function blurFocusedInput() {
  const el = document.activeElement;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.blur();
  }
}

/**
 * Keeps the on-screen keyboard closed when a step with text fields appears,
 * until the user explicitly taps an input (e.g. after "Proceed" on mobile).
 */
export function usePreventAutoKeyboard(active: boolean) {
  useEffect(() => {
    if (!active) return;

    blurFocusedInput();
    const raf = requestAnimationFrame(blurFocusedInput);
    const timeout = window.setTimeout(blurFocusedInput, 50);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [active]);
}
