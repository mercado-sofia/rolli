import { type ReactNode } from "react";

import { APP_CONTAINER_SURFACE } from "@/lib/app-page-layout";
import { cn } from "@/lib/utils";

type FormCalloutProps = {
  children: ReactNode;
  className?: string;
};

export function FormCallout({ children, className }: FormCalloutProps) {
  return (
    <div
      className={cn(
        APP_CONTAINER_SURFACE,
        "rounded-2xl px-5 py-4 text-sm leading-relaxed text-muted",
        className,
      )}
    >
      {children}
    </div>
  );
}
