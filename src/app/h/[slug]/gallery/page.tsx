"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";

import { BackHomeButton } from "@/components/hangout/back-home-button";
import { GalleryExperience } from "@/components/hangout/gallery-experience";
import { HangoutParticipantSessionGate } from "@/components/hangout/hangout-participant-session-gate";
import { SetupFlowHeader } from "@/components/layout/setup-flow-header";
import {
  SetupFlowFooter,
  SetupFlowShell,
  SETUP_FLOW_HEADER_COMPACT_CLASS,
  SETUP_FLOW_MAIN_CLASS,
  SETUP_FLOW_MAIN_INNER_CLASS,
  SETUP_FLOW_MAIN_UPPER_CLASS,
} from "@/components/layout/setup-flow-shell";
import { HangoutPageLoadGate } from "@/components/hangout/hangout-page-load-gate";
import { useDisplayHangout } from "@/hooks/use-display-hangout";
import { useHangoutGateBinding } from "@/hooks/use-hangout-gate-binding";
import { useHangoutRouteGuard } from "@/hooks/use-hangout-route-guard";
import { HANGOUT_GALLERY_PATH_SUFFIX } from "@/lib/hangout/routes";
import { useHangoutSessionGuard } from "@/hooks/use-hangout-session-guard";
import { useSessionHydrated } from "@/hooks/use-session-hydrated";
import {
  APP_PRIMARY_BUTTON_CLASS,
  GALLERY_LOADING_MIN_HEIGHT_CLASS,
} from "@/lib/app-page-layout";
import { HANGOUT_LIMITS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";

/** Scroll the full page (header + content + actions) instead of pinning CTAs to the viewport. */
const GALLERY_SHELL_CLASS =
  "!max-h-none overflow-y-auto overscroll-y-contain supports-[height:100dvh]:!max-h-none";

const GALLERY_MAIN_CLASS = cn(
  SETUP_FLOW_MAIN_CLASS,
  SETUP_FLOW_MAIN_UPPER_CLASS,
  "!min-h-0 !flex-none !overflow-visible md:!overflow-visible",
  "md:rounded-b-[1.75rem] md:border-b md:pb-8 lg:pb-9",
);

const GALLERY_FOOTER_CLASS = cn(
  "mt-8 md:col-auto md:row-auto",
  "md:mx-0 md:rounded-none md:border-0 md:border-t md:border-container-border/60 md:px-0 md:pb-0 md:pt-8 lg:pt-9",
);

export default function GalleryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const sessionHydrated = useSessionHydrated();
  const storeParticipant = useSessionStore((state) => state.participant);
  const { displayHangout, isLoading, loadError, retry } = useDisplayHangout(slug);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryLoadingHangoutId, setGalleryLoadingHangoutId] = useState<
    string | null
  >(null);

  const activeHangoutId = displayHangout?.id ?? null;
  if (activeHangoutId !== galleryLoadingHangoutId) {
    setGalleryLoadingHangoutId(activeHangoutId);
    if (activeHangoutId !== null) {
      setGalleryLoading(true);
    }
  }

  useHangoutRouteGuard({
    slug,
    hangout: displayHangout,
    isLoading,
    guardPathSuffix: HANGOUT_GALLERY_PATH_SUFFIX,
  });
  const { participant, hasValidSession } = useHangoutSessionGuard({
    slug,
    hangout: displayHangout,
    isLoading,
  });
  const gateBinding = useHangoutGateBinding(slug, displayHangout, storeParticipant);

  const handleGalleryLoadingChange = useCallback((loading: boolean) => {
    setGalleryLoading(loading);
  }, []);

  const galleryReady =
    sessionHydrated &&
    hasValidSession &&
    participant &&
    displayHangout;

  return (
    <HangoutPageLoadGate
      loadError={loadError}
      isLoading={isLoading}
      displayHangout={displayHangout}
      sessionHydrated={sessionHydrated}
      forceLoading={!galleryReady && !gateBinding}
      onRetry={retry}
      mainClassName={GALLERY_MAIN_CLASS}
      loadingSkeleton={
        <div className={cn("animate-pulse rounded-3xl bg-black/10", GALLERY_LOADING_MIN_HEIGHT_CLASS)} />
      }
    >
      {gateBinding ? (
    <HangoutParticipantSessionGate
      slug={slug}
      hangoutId={gateBinding.hangoutId}
      sessionToken={gateBinding.sessionToken}
      hangoutTitle={gateBinding.hangoutTitle}
    >
      {galleryReady && participant && displayHangout ? (
    <SetupFlowShell compact className={GALLERY_SHELL_CLASS}>
      <header className={SETUP_FLOW_HEADER_COMPACT_CLASS}>
        <SetupFlowHeader
          compact
          showProgress={false}
          title={displayHangout.title}
          sublabel="Memory gallery"
        />
      </header>

      <main className={GALLERY_MAIN_CLASS}>
        <div className={SETUP_FLOW_MAIN_INNER_CLASS}>
          <GalleryExperience
            hangoutId={displayHangout.id}
            sessionToken={participant.sessionToken}
            hangoutTitle={displayHangout.title}
            onLoadingChange={handleGalleryLoadingChange}
          />

          {!galleryLoading ? (
            <SetupFlowFooter
              className={GALLERY_FOOTER_CLASS}
              hint={`Save your favorite memories or head back home. Memories are kept for ${HANGOUT_LIMITS.retentionDays} days.`}
            >
              <BackHomeButton className={APP_PRIMARY_BUTTON_CLASS} />
              <Link
                href={`/h/${slug}/guessing`}
                className="inline-flex min-h-11 items-center justify-center text-center text-sm text-muted underline underline-offset-4"
              >
                Back to results
              </Link>
            </SetupFlowFooter>
          ) : null}
        </div>
      </main>
    </SetupFlowShell>
      ) : null}
    </HangoutParticipantSessionGate>
      ) : null}
    </HangoutPageLoadGate>
  );
}
