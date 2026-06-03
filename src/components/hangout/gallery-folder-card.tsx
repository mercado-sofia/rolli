"use client";

import { LuFolder } from "react-icons/lu";

import { LANDING_ICON_CLASS } from "@/components/landing/landing-icons";
import type { GalleryPastelTheme } from "@/lib/hangout/gallery";
import { cn } from "@/lib/utils";

type GalleryFolderCardProps = {
  nickname: string;
  realName?: string;
  theme: GalleryPastelTheme;
  selected?: boolean;
  /** Smaller card when 3+ folders share a row on mobile. */
  compact?: boolean;
  onSelect: () => void;
};

export function GalleryFolderCard({
  nickname,
  realName,
  theme,
  selected = false,
  compact = false,
  onSelect,
}: GalleryFolderCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex aspect-square w-full flex-col items-center justify-center border-2 text-center transition-[border-color,box-shadow] duration-200",
        compact
          ? "rounded-2xl px-2 py-4 md:rounded-3xl md:px-4 md:py-6"
          : "rounded-3xl px-4 py-6",
        selected
          ? "border-(--gallery-accent) shadow-[0_12px_32px_rgba(26,26,26,0.08)]"
          : "border-transparent hover:border-(--gallery-accent) hover:shadow-[0_12px_32px_rgba(26,26,26,0.08)]",
      )}
      style={
        {
          "--gallery-accent": theme.accent,
          backgroundColor: theme.background,
        } as React.CSSProperties
      }
    >
      <LuFolder
        className={cn(
          LANDING_ICON_CLASS,
          "shrink-0",
          compact ? "h-8 w-8 md:h-11 md:w-11" : "h-11 w-11",
        )}
        style={{ color: theme.accent }}
        aria-hidden
      />
      <p
        className={cn(
          "line-clamp-2 font-semibold text-ink",
          compact ? "mt-2 text-xs md:mt-4 md:text-base" : "mt-4 text-base",
        )}
      >
        {nickname}
      </p>
      {realName ? (
        <p
          className={cn(
            "line-clamp-2 text-muted",
            compact ? "mt-0.5 text-[11px] md:mt-1 md:text-sm" : "mt-1 text-sm",
          )}
        >
          {realName}
        </p>
      ) : null}
    </button>
  );
}
