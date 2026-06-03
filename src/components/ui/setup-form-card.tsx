import { type ReactNode } from "react";

import { APP_CONTAINER_SURFACE } from "@/lib/app-page-layout";
import { cn } from "@/lib/utils";

type SetupFormCardProps = {
  children: ReactNode;
  className?: string;
};

/** Spacious form container for setup / join flows */
export function SetupFormCard({ children, className }: SetupFormCardProps) {
  return (
    <div
      className={cn(
        APP_CONTAINER_SURFACE,
        "rounded-[1.75rem] px-5 py-7 sm:px-6 sm:py-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
