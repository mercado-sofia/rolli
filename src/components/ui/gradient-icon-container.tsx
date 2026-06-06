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

const animatedBorderGradient =
  "conic-gradient(from 0deg, rgb(26 26 26 / 0.14) 0deg, rgb(185 147 214 / 0.55) 100deg, rgb(251 162 194 / 0.5) 200deg, rgb(26 26 26 / 0.14) 300deg, rgb(26 26 26 / 0.14) 360deg)";

type GradientIconContainerProps = {
  children: ReactNode;
  size?: keyof typeof sizeStyles;
  /** `pink` for landing marketing sections; default keeps lavender gradient. */
  borderTone?: keyof typeof borderToneStyles;
  /** Slowly rotating lavender/pink gradient along the border edge. */
  animatedBorder?: boolean;
  className?: string;
};

export function GradientIconContainer({
  children,
  size = "md",
  borderTone = "default",
  animatedBorder = false,
  className,
}: GradientIconContainerProps) {
  const styles = sizeStyles[size];

  if (animatedBorder) {
    return (
      <div
        className={cn(
          "relative inline-flex shrink-0 overflow-hidden p-px",
          styles.outer,
          className,
        )}
      >
        <div
          className="icon-border-gradient-spin absolute inset-[-100%]"
          style={{ background: animatedBorderGradient }}
          aria-hidden
        />
        <div
          className={cn(
            "relative z-10 flex h-full w-full items-center justify-center bg-white",
            styles.inner,
          )}
        >
          {children}
        </div>
      </div>
    );
  }

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
