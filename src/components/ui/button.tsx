"use client";

import Link from "next/link";
import { type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "gradient";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  href?: string;
  children: ReactNode;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "border border-ink bg-ink text-white hover:bg-[#2a2a2a] active:scale-[0.98]",
  secondary:
    "border border-black/8 bg-white text-ink hover:bg-white/90 active:scale-[0.98]",
  gradient:
    "border-0 bg-gradient-pastel text-white hover:brightness-[1.02] active:scale-[0.98]",
};

export function Button({
  variant = "primary",
  href,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const classes = cn(
    "group/btn relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full px-6 text-sm font-medium outline-none transition-all duration-300 hover:-translate-y-1 active:translate-y-0 focus:outline-none focus-visible:outline-none",
    variantStyles[variant],
    disabled && "pointer-events-none opacity-50",
    className,
  );

  const shimmer = (
    <span
      className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/40 to-transparent group-hover/btn:animate-[shimmer_0.5s_ease-out_forwards]"
      aria-hidden
    />
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {shimmer}
        {children}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      disabled={disabled}
      suppressHydrationWarning
      {...props}
    >
      {shimmer}
      {children}
    </button>
  );
}