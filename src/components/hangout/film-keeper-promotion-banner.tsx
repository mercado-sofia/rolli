"use client";

import { cn } from "@/lib/utils";

type FilmKeeperPromotionBannerProps = {
  visible: boolean;
  onDismiss: () => void;
  className?: string;
};

export function FilmKeeperPromotionBanner({
  visible,
  onDismiss,
  className,
}: FilmKeeperPromotionBannerProps) {
  if (!visible) return null;

  return (
    <div
      role="status"
      className={cn(
        "rounded-2xl border border-lavender-deep/30 bg-gradient-pastel px-4 py-3 text-center text-sm text-white",
        className,
      )}
    >
      <p>You&apos;re now the Film Keeper.</p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-1 text-xs underline underline-offset-2 opacity-90"
      >
        Dismiss
      </button>
    </div>
  );
}
