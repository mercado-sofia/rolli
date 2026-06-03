import { type ReactNode } from "react";

import {
  APP_CONTAINER_CLASS,
  APP_CONTAINER_CLASS_NEUTRAL,
} from "@/lib/app-page-layout";
import { cn } from "@/lib/utils";

type CardProps = {
  children: ReactNode;
  className?: string;
  gradient?: boolean;
  /** `neutral` uses a subtle gray border instead of pink */
  border?: "pink" | "neutral";
};

export function Card({
  children,
  className,
  gradient = false,
  border = "pink",
}: CardProps) {
  return (
    <div
      className={cn(
        "p-6 md:p-7",
        gradient
          ? "rounded-3xl border border-lavender-deep/25 bg-gradient-pastel text-white"
          : border === "neutral"
            ? APP_CONTAINER_CLASS_NEUTRAL
            : APP_CONTAINER_CLASS,
        className,
      )}
    >
      {children}
    </div>
  );
}
