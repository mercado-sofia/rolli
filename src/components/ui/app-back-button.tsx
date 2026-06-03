"use client";

import Link from "next/link";
import { IoChevronBackOutline } from "react-icons/io5";

import { cn } from "@/lib/utils";

type AppBackButtonProps = {
  backHref?: string;
  onBack?: () => void;
  backLabel?: string;
  className?: string;
};

export function AppBackButton({
  backHref,
  onBack,
  backLabel = "Go back",
  className,
}: AppBackButtonProps) {
  const buttonClass = cn(
    "flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-white",
    "text-ink outline-none transition-colors hover:bg-[#fafafa] active:scale-95",
    "focus:outline-none focus-visible:outline-none",
    className,
  );

  const icon = (
    <IoChevronBackOutline size={22} className="text-ink" aria-hidden />
  );

  if (backHref) {
    return (
      <Link href={backHref} className={buttonClass} aria-label={backLabel}>
        {icon}
      </Link>
    );
  }

  if (onBack) {
    return (
      <button type="button" onClick={onBack} className={buttonClass} aria-label={backLabel}>
        {icon}
      </button>
    );
  }

  return null;
}
