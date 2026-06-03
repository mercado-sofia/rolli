"use client";

import { useParams, useRouter } from "next/navigation";

import { InviteLinkCard } from "@/components/hangout/invite-link-card";
import { SetupFlowHeader } from "@/components/layout/setup-flow-header";
import {
  SetupFlowFooter,
  SetupFlowShell,
  SETUP_FLOW_HEADER_CLASS,
  SETUP_FLOW_MAIN_CENTER_CLASS,
  SETUP_FLOW_MAIN_CLASS,
  SETUP_FLOW_MAIN_INNER_CLASS,
} from "@/components/layout/setup-flow-shell";
import { Button } from "@/components/ui/button";
import { HangoutPageLoadGate } from "@/components/hangout/hangout-page-load-gate";
import { useDisplayHangout } from "@/hooks/use-display-hangout";
import { useHangoutRouteGuard } from "@/hooks/use-hangout-route-guard";
import { useHangoutSessionGuard } from "@/hooks/use-hangout-session-guard";
import { APP_PRIMARY_BUTTON_CLASS } from "@/lib/app-page-layout";
import { buildInviteUrl } from "@/lib/hangout/join";
import { SETUP_FLOW_TOTAL_STEPS, setupFlowSteps } from "@/lib/hangout/setup";
import { cn } from "@/lib/utils";

export default function HangoutSharePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;

  const { displayHangout, isLoading, loadError, retry } = useDisplayHangout();

  useHangoutRouteGuard({ slug, hangout: displayHangout, isLoading });
  const { hasValidSession } = useHangoutSessionGuard({
    slug,
    hangout: displayHangout,
    isLoading,
  });

  const shareReady =
    hasValidSession &&
    displayHangout &&
    displayHangout.status === "waiting";

  const isCancelled = displayHangout?.status === "cancelled";
  const waitingPath = `/h/${slug}/waiting`;

  return (
    <HangoutPageLoadGate
      loadError={loadError}
      isLoading={isLoading}
      displayHangout={displayHangout}
      forceLoading={!shareReady && !isCancelled}
      onRetry={retry}
      loadingSkeleton={
        <div className="h-48 w-full animate-pulse rounded-3xl border border-container-border bg-white" />
      }
    >
      {shareReady && displayHangout ? (
    <SetupFlowShell>
      <header className={SETUP_FLOW_HEADER_CLASS}>
        <SetupFlowHeader
          currentStep={setupFlowSteps.createLinkReady}
          totalSteps={SETUP_FLOW_TOTAL_STEPS}
          backHref={waitingPath}
          backLabel="Back to waiting room"
          title="Ready to roll!"
          sublabel="Share with your friends"
        />
      </header>

      <main
        className={cn(
          SETUP_FLOW_MAIN_CLASS,
          SETUP_FLOW_MAIN_CENTER_CLASS,
        )}
      >
        <div className={SETUP_FLOW_MAIN_INNER_CLASS}>
          <InviteLinkCard
            inviteUrl={buildInviteUrl(slug)}
            hangoutTitle={displayHangout.title}
          />
        </div>
      </main>

      <SetupFlowFooter hint="Copy the link and send it to friends before you start.">
        <Button
          type="button"
          onClick={() => router.push(waitingPath)}
          className={APP_PRIMARY_BUTTON_CLASS}
        >
          Back to waiting room
        </Button>
      </SetupFlowFooter>
    </SetupFlowShell>
      ) : null}
    </HangoutPageLoadGate>
  );
}
