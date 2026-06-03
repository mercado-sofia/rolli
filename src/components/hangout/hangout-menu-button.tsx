"use client";

import { TfiMenuAlt } from "react-icons/tfi";

import { cn } from "@/lib/utils";

type HangoutMenuButtonProps = {
  onClick: () => void;
  className?: string;
};

export function HangoutMenuButton({ onClick, className }: HangoutMenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-[#F8F8F8]",
        "text-ink outline-none transition-colors hover:bg-[#F0F0F0] active:scale-95",
        className,
      )}
      aria-label="Open hangout menu"
    >
      <TfiMenuAlt size={20} strokeWidth={0.25} aria-hidden />
    </button>
  );
}
