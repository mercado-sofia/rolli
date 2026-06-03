"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TbDoorExit } from "react-icons/tb";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { leaveHangout } from "@/lib/hangout/hangout-api";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session-store";

type BackHomeButtonProps = {
  label?: string;
  className?: string;
};

export function BackHomeButton({
  label = "Back to home",
  className,
}: BackHomeButtonProps) {
  const router = useRouter();
  const leaveForHome = useSessionStore((state) => state.leaveForHome);

  function handleBackHome() {
    leaveForHome();
    router.replace("/");
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className={cn(className)}
      onClick={handleBackHome}
    >
      {label}
    </Button>
  );
}

type LeaveRoomButtonProps = {
  hangoutId: string;
  sessionToken: string;
  className?: string;
  isFilmKeeper?: boolean;
};

export function LeaveRoomButton({
  hangoutId,
  sessionToken,
  className,
  isFilmKeeper = false,
}: LeaveRoomButtonProps) {
  const router = useRouter();
  const leaveForHome = useSessionStore((state) => state.leaveForHome);

  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpen() {
    setError(null);
    setOpen(true);
  }

  function handleCancel() {
    if (leaving) return;
    setOpen(false);
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

    setOpen(false);
    leaveForHome();
    router.replace("/");
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        disabled={leaving}
        className={cn(className)}
        onClick={handleOpen}
      >
        Leave room
      </Button>

      <ConfirmDialog
        open={open}
        accent="ink"
        icon={
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/8">
            <TbDoorExit size={36} className="text-ink" aria-hidden />
          </span>
        }
        title="Leave the room?"
        description={
          <>
            You&apos;ll be removed from this hangout. You can rejoin with your
            invite link if the room is still open.
            {isFilmKeeper ? (
              <>
                {" "}
                If you&apos;re the Film Keeper, host duties pass to the next
                person in the room.
              </>
            ) : null}
          </>
        }
        confirmLabel="Yes, leave room"
        cancelLabel="Stay in room"
        loading={leaving}
        error={error}
        dismissible={!leaving}
        onConfirm={() => void handleConfirm()}
        onCancel={handleCancel}
      />
    </>
  );
}
