"use client";

import { useRouter } from "next/navigation";
import { TbMoodSad } from "react-icons/tb";

import { SetupFlowHeader } from "@/components/layout/setup-flow-header";
import { Button } from "@/components/ui/button";
import {
  SetupFlowFooter,
  SetupFlowShell,
  SETUP_FLOW_HEADER_COMPACT_CLASS,
  SETUP_FLOW_MAIN_CENTER_CLASS,
  SETUP_FLOW_MAIN_CLASS,
  SETUP_FLOW_MAIN_INNER_CLASS,
} from "@/components/layout/setup-flow-shell";
import {
  APP_PRIMARY_BUTTON_CLASS,
  HANGOUT_PINK_GRADIENT_BUTTON_CLASS,
} from "@/lib/app-page-layout";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";

export const HANGOUT_KICKED_MESSAGE =
  "The Film Keeper removed you from this hangout. You can join again while the hangout is still open — your memories and guesses start fresh.";

type HangoutKickedOutProps = {
  title?: string;
  slug?: string;
  onGoHome?: () => void;
  onJoinAgain?: () => void;
};

export function HangoutKickedOut({
  title,
  slug,
  onGoHome,
  onJoinAgain,
}: HangoutKickedOutProps) {
  const router = useRouter();
  const leaveForHome = useSessionStore((state) => state.leaveForHome);
  const resetSession = useSessionStore((state) => state.resetSession);

  function handleGoHome() {
    if (onGoHome) {
      onGoHome();
      return;
    }
    leaveForHome();
    router.replace("/");
  }

  function handleJoinAgain() {
    if (onJoinAgain) {
      onJoinAgain();
      return;
    }
    resetSession();
    if (slug) {
      router.replace(`/h/${slug}`);
    }
  }

  return (
    <SetupFlowShell compact>
      <header className={SETUP_FLOW_HEADER_COMPACT_CLASS}>
        <SetupFlowHeader
          compact
          showProgress={false}
          title={title ?? "Hangout"}
          sublabel="Removed from hangout"
          titleTone="ink"
        />
      </header>

      <main className={cn(SETUP_FLOW_MAIN_CLASS, SETUP_FLOW_MAIN_CENTER_CLASS)}>
        <div
          className={cn(
            SETUP_FLOW_MAIN_INNER_CLASS,
            "flex flex-col items-center gap-6 text-center",
          )}
        >
          <span
            className="flex h-20 w-20 items-center justify-center rounded-full bg-black/6"
            aria-hidden
          >
            <TbMoodSad size={44} className="text-ink/70" />
          </span>
          <p className="max-w-sm text-base leading-relaxed text-muted sm:text-sm">
            {HANGOUT_KICKED_MESSAGE}
          </p>
        </div>
      </main>

      <SetupFlowFooter>
        <div className="flex w-full flex-col gap-3">
          <Button
            type="button"
            className={HANGOUT_PINK_GRADIENT_BUTTON_CLASS}
            onClick={handleJoinAgain}
          >
            Join again
          </Button>
          <Button
            type="button"
            variant="secondary"
            className={APP_PRIMARY_BUTTON_CLASS}
            onClick={handleGoHome}
          >
            Go home
          </Button>
        </div>
      </SetupFlowFooter>
    </SetupFlowShell>
  );
}
