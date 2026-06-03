"use client";

import { createPortal } from "react-dom";

import { FIXED_VIEWPORT_BLEED_CLASS } from "@/lib/app-page-layout";
import { cn } from "@/lib/utils";

type RevealCountdownOverlayProps = {
  seconds: number;
};

export function RevealCountdownOverlay({ seconds }: RevealCountdownOverlayProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(FIXED_VIEWPORT_BLEED_CLASS, "z-100 flex items-center justify-center bg-ink/70 backdrop-blur-sm")}
      role="status"
      aria-live="polite"
      aria-label={`Reveal starting in ${seconds}`}
    >
      <div className="flex h-full w-full items-center justify-center px-6">
        <span
          key={seconds}
          className="reveal-countdown-digit bg-gradient-pink-highlight bg-clip-text font-display text-[clamp(5.5rem,32vw,8.5rem)] leading-none text-transparent tabular-nums"
        >
          {seconds}
        </span>
      </div>
    </div>,
    document.body,
  );
}
