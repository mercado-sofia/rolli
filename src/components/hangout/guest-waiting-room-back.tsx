"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";
import { TbDoorExit } from "react-icons/tb";

import { SetupFlowHeader } from "@/components/layout/setup-flow-header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { leaveHangout } from "@/lib/hangout/hangout-api";
import {
  clearWaitingReturnPath,
  getWaitingReturnPath,
  hangoutInviteReturnPath,
} from "@/lib/hangout/join";
import { useSessionStore } from "@/store/session-store";

type GuestWaitingRoomBackProps = {
  slug: string;
  hangoutId: string;
  sessionToken: string;
  title: string;
  sublabel?: string;
  trailingAction?: ReactNode;
};

export function GuestWaitingRoomBack({
  slug,
  hangoutId,
  sessionToken,
  title,
  sublabel = "Waiting room",
  trailingAction,
}: GuestWaitingRoomBackProps) {
  const router = useRouter();
  const resetSession = useSessionStore((state) => state.resetSession);

  const returnPath = useMemo(
    () => getWaitingReturnPath(slug, hangoutInviteReturnPath(slug)),
    [slug],
  );

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backLabel = returnPath.startsWith("/join") ? "Back to join" : "Back";

  function handleOpenBack() {
    setError(null);
    setConfirmOpen(true);
  }

  function handleCancel() {
    if (leaving) return;
    setConfirmOpen(false);
    setError(null);
  }

  async function handleConfirm() {
    setLeaving(true);
    setError(null);

    const { error: leaveError } = await leaveHangout(hangoutId, sessionToken);

    setLeaving(false);

    if (leaveError) {
      setError(leaveError);
      return;
    }

    resetSession();
    clearWaitingReturnPath(slug);
    setConfirmOpen(false);
    router.push(returnPath);
  }

  return (
    <>
      <SetupFlowHeader
        showProgress={false}
        title={title}
        sublabel={sublabel}
        onBack={handleOpenBack}
        backLabel={backLabel}
        trailingAction={trailingAction}
      />
      <ConfirmDialog
        open={confirmOpen}
        accent="ink"
        icon={
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/8">
            <TbDoorExit size={36} className="text-ink" aria-hidden />
          </span>
        }
        title="Leave the waiting room?"
        description={
          <>
            Going back takes you out of this hangout. You&apos;ll return to the
            identity step and need to enter your details again to rejoin.
          </>
        }
        confirmLabel="Yes, leave room"
        cancelLabel="Stay in room"
        onConfirm={() => void handleConfirm()}
        onCancel={handleCancel}
        loading={leaving}
        error={error}
      />
    </>
  );
}
