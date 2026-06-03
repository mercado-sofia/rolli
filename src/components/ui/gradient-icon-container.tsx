import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

const sizeStyles = {
  md: {
    outer: "h-14 w-14 rounded-2xl",
    inner: "rounded-[15px]",
  },
  lg: {
    outer: "h-16 w-16 rounded-2xl",
    inner: "rounded-[15px]",
  },
} as const;

const borderToneStyles = {
  default: "border-lavender-deep/25 bg-gradient-pastel",
  pink: "border-pink-highlight/40 bg-pink/25",
  ink: "border-ink/20 bg-white",
} as const;

type GradientIconContainerProps = {
  children: ReactNode;
  size?: keyof typeof sizeStyles;
  /** `pink` for landing marketing sections; default keeps lavender gradient. */
  borderTone?: keyof typeof borderToneStyles;
  className?: string;
};

export function GradientIconContainer({
  children,
  size = "md",
  borderTone = "default",
  className,
}: GradientIconContainerProps) {
  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        "inline-flex shrink-0 border p-px",
        borderToneStyles[borderTone],
        styles.outer,
        className,
      )}
    >
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-white",
          styles.inner,
        )}
      >
        {children}
      </div>
    </div>
  );
}
