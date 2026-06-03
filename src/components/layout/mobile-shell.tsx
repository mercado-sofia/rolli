import { type ReactNode } from "react";

import {
  APP_SAFE_BOTTOM,
  APP_SHELL_DESKTOP_FRAME,
  APP_SHELL_DESKTOP_INSET,
  APP_SHELL_MAX_WIDTH,
  APP_SHELL_PADDING_X,
  APP_SHELL_PY,
} from "@/lib/app-page-layout";
import { cn } from "@/lib/utils";

type MobileShellProps = {
  children: ReactNode;
  className?: string;
  backgroundClassName?: string;
  ambient?: boolean;
  /** When false, parent controls height (e.g. hero fits below navbar). */
  fillViewport?: boolean;
  /** App pages: tighter vertical padding on mobile; landing keeps default. */
  variant?: "default" | "app";
  /** Enables vertical scroll when content exceeds the viewport (app pages). */
  scrollable?: boolean;
  /** Raised white card on md+ (disable for split-panel setup flows). Default true. */
  desktopFrame?: boolean;
};

export function MobileShell({
  children,
  className,
  backgroundClassName = "bg-canvas",
  ambient = true,
  fillViewport = true,
  variant = "default",
  scrollable = false,
  desktopFrame = true,
}: MobileShellProps) {
  const isApp = variant === "app";
  const shellPadding = isApp
    ? cn(APP_SHELL_PADDING_X, APP_SHELL_PY, APP_SAFE_BOTTOM)
    : "px-4 py-8 sm:px-5";
  const contentMaxWidth = isApp ? APP_SHELL_MAX_WIDTH : "max-w-md";
  const desktopPanel =
    isApp && fillViewport
      ? cn(
          APP_SHELL_DESKTOP_INSET,
          desktopFrame && APP_SHELL_DESKTOP_FRAME,
        )
      : null;

  return (
    <div
      className={cn(
        "relative overflow-x-hidden text-ink",
        backgroundClassName,
        fillViewport
          ? "min-h-dvh supports-[height:100dvh]:min-h-dvh"
          : "h-full min-h-0",
      )}
    >
      {ambient && (
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
        >
          <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-pink/15 blur-3xl md:-left-32 md:h-96 md:w-96 md:blur-[4rem]" />
          <div className="absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-pink-highlight/10 blur-3xl md:-right-28 md:top-[18%] md:h-md md:w-md md:blur-[5rem]" />
          {isApp ? (
            <div className="absolute bottom-0 left-1/2 hidden h-80 w-80 -translate-x-1/2 translate-y-1/3 rounded-full bg-lavender/20 blur-3xl md:block" />
          ) : null}
        </div>
      )}
      <div
        className={cn(
          "relative mx-auto flex w-full min-w-0 flex-col",
          contentMaxWidth,
          desktopPanel,
          fillViewport
            ? cn(
                "min-h-dvh supports-[height:100dvh]:min-h-dvh",
                shellPadding,
                scrollable && "overflow-y-auto overscroll-y-contain",
              )
            : "h-full min-h-0 py-0",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
