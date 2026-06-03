"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TbMoodSad } from "react-icons/tb";

import { HANGOUT_CANCELLED_MESSAGE } from "@/components/hangout/hangout-invitation-closed";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { abandonHangout } from "@/lib/hangout/hangout-api";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";
import type { Hangout } from "@/types/hangout";

export type AbandonHangoutUiState = "idle" | "working" | "success" | "leaving";

type AbandonHangoutControlProps = {
  hangoutId: string;
  sessionToken: string;
  className?: string;
  hideTrigger?: boolean;
  /** Pill button for host footer row (no underline, pink border). */
  triggerVariant?: "link" | "pill";
  /** Cancel button label on the confirm dialog. */
  cancelLabel?: string;
  /** When true, copy reflects an in-progress capture session. */
  isActiveSession?: boolean;
  onAbandoned?: (hangout: Hangout) => void;
  onUiStateChange?: (state: AbandonHangoutUiState) => void;
};

type AbandonModalPhase = "confirm" | "success";

export function AbandonHangoutControl({
  hangoutId,
  sessionToken,
  className,
  hideTrigger = false,
  triggerVariant = "link",
  cancelLabel = "Keep waiting",
  isActiveSession = false,
  onAbandoned,
  onUiStateChange,
}: AbandonHangoutControlProps) {
  const router = useRouter();
  const leaveForHome = useSessionStore((state) => state.leaveForHome);

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<AbandonModalPhase>("confirm");
  const [abandoning, setAbandoning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpen() {
    setPhase("confirm");
    setError(null);
    setOpen(true);
  }

  function handleCancel() {
    if (abandoning) return;
    setOpen(false);
    setError(null);
    onUiStateChange?.("idle");
  }

  async function handleConfirm() {
    onUiStateChange?.("working");
    setAbandoning(true);
    setError(null);

    const { data, error: abandonError } = await abandonHangout(hangoutId, sessionToken);

    if (abandonError || !data) {
      setAbandoning(false);
      setError(abandonError ?? "Could not abandon hangout");
      onUiStateChange?.("idle");
      return;
    }

    onAbandoned?.(data);

    requestAnimationFrame(() => {
      setAbandoning(false);
      setPhase("success");
      onUiStateChange?.("success");
    });
  }

  function handleGoHome() {
    onUiStateChange?.("leaving");
    setOpen(false);
    leaveForHome();
    router.replace("/");
  }

  return (
    <>
      {!hideTrigger ? (
        <button
          type="button"
          onClick={handleOpen}
          className={cn(
            triggerVariant === "pill"
              ? [
                  "touch-manipulation",
                  "inline-flex w-full min-w-0 items-center justify-center rounded-full",
                  "border border-pink-accent bg-white px-6 text-sm font-medium text-pink-accent no-underline",
                  "outline-none transition-all duration-300 hover:-translate-y-1 active:translate-y-0",
                  "hover:border-pink-deep hover:bg-pink/5 hover:text-pink-deep active:scale-[0.98]",
                ]
              : [
                  "touch-manipulation",
                  "inline-flex min-h-12 w-full items-center justify-center rounded-full px-4",
                  "text-sm font-medium text-muted underline underline-offset-4",
                  "outline-none transition-all duration-300 hover:-translate-y-1 hover:text-pink-accent active:translate-y-0 active:scale-[0.98]",
                  "sm:inline-flex sm:min-h-11 sm:w-auto sm:rounded-none sm:px-0 sm:hover:translate-y-0 sm:active:scale-100",
                ],
            className,
          )}
        >
          Abandon hangout
        </button>
      ) : null}

      <ConfirmDialog
        open={open}
        accent="pink"
        icon={
          phase === "confirm" ? (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-pink/15">
              <TbMoodSad size={36} className="text-pink-accent" aria-hidden />
            </span>
          ) : undefined
        }
        title={phase === "confirm" ? "Abandon this hangout?" : "Invitation closed"}
        description={
          phase === "confirm" ? (
            <>
              This closes the room for everyone. Invite links will stop working and
              the hangout cannot be restarted
              {isActiveSession ? " — photo capture will stop for all guests" : ""}.
            </>
          ) : (
            <>{HANGOUT_CANCELLED_MESSAGE}</>
          )
        }
        confirmLabel={phase === "confirm" ? "Yes, abandon hangout" : "Go home"}
        cancelLabel={cancelLabel}
        loading={phase === "confirm" && abandoning}
        error={phase === "confirm" ? error : null}
        showCancelButton={phase === "confirm"}
        dismissible={phase === "confirm" && !abandoning}
        onConfirm={() => {
          if (phase === "confirm") {
            void handleConfirm();
            return;
          }
          handleGoHome();
        }}
        onCancel={phase === "confirm" ? handleCancel : undefined}
      />
    </>
  );
}
