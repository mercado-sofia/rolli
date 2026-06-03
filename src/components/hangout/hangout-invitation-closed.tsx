"use client";

import { useRouter } from "next/navigation";

import { SetupFlowHeader } from "@/components/layout/setup-flow-header";
import { Button } from "@/components/ui/button";
import {
  SetupFlowFooter,
  SetupFlowShell,
  SETUP_FLOW_HEADER_CLASS,
  SETUP_FLOW_MAIN_CENTER_CLASS,
  SETUP_FLOW_MAIN_CLASS,
  SETUP_FLOW_MAIN_INNER_CLASS,
} from "@/components/layout/setup-flow-shell";
import { APP_PRIMARY_BUTTON_CLASS } from "@/lib/app-page-layout";
import { SETUP_FLOW_TOTAL_STEPS, setupFlowSteps } from "@/lib/hangout/setup";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";

export const HANGOUT_CANCELLED_MESSAGE =
  "This hangout was abandoned. New guests cannot join.";

export const HANGOUT_CANCELLED_FOOTER_HINT =
  "The Film Keeper ended this hangout for everyone.";

type HangoutInvitationClosedContentProps = {
  showGoHomeLink?: boolean;
  onGoHomeClick?: () => void;
};

export function HangoutInvitationClosedContent({
  showGoHomeLink = true,
  onGoHomeClick,
}: HangoutInvitationClosedContentProps) {
  const router = useRouter();
  const leaveForHome = useSessionStore((state) => state.leaveForHome);

  function handleDefaultGoHome() {
    leaveForHome();
    router.replace("/");
  }

  const goHomeHandler = onGoHomeClick ?? handleDefaultGoHome;

  return (
    <div className="flex w-full flex-col items-stretch gap-6 px-1 sm:px-0">
      <p className="text-center text-base leading-relaxed text-muted sm:text-sm">
        {HANGOUT_CANCELLED_MESSAGE}
      </p>
      {showGoHomeLink ? (
        <Button
          type="button"
          variant="secondary"
          className={cn(APP_PRIMARY_BUTTON_CLASS, "touch-manipulation")}
          onClick={goHomeHandler}
        >
          Go home
        </Button>
      ) : null}
    </div>
  );
}

type HangoutInvitationClosedProps = {
  title: string;
  showGoHomeLink?: boolean;
  headerClassName?: string;
  onGoHomeClick?: () => void;
};

export function HangoutInvitationClosed({
  title,
  showGoHomeLink = true,
  headerClassName = SETUP_FLOW_HEADER_CLASS,
  onGoHomeClick,
}: HangoutInvitationClosedProps) {
  const router = useRouter();
  const leaveForHome = useSessionStore((state) => state.leaveForHome);

  function handleDefaultGoHome() {
    leaveForHome();
    router.replace("/");
  }

  const goHomeHandler = onGoHomeClick ?? handleDefaultGoHome;

  return (
    <SetupFlowShell>
      <header className={headerClassName}>
        <SetupFlowHeader
          currentStep={setupFlowSteps.inviteJoin}
          totalSteps={SETUP_FLOW_TOTAL_STEPS}
          onBack={goHomeHandler}
          backLabel="Go home"
          title={title}
          sublabel="Invitation closed"
        />
      </header>

      <main
        className={cn(
          SETUP_FLOW_MAIN_CLASS,
          SETUP_FLOW_MAIN_CENTER_CLASS,
        )}
      >
        <div className={SETUP_FLOW_MAIN_INNER_CLASS}>
          <HangoutInvitationClosedContent
            showGoHomeLink={showGoHomeLink}
            onGoHomeClick={goHomeHandler}
          />
        </div>
      </main>

      <SetupFlowFooter hint={HANGOUT_CANCELLED_FOOTER_HINT} />
    </SetupFlowShell>
  );
}
