"use client";

import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { flushSync } from "react-dom";

import { HangoutMenuModal, type HangoutMenuMode } from "@/components/hangout/hangout-menu-modal";
import { useHangoutRoster } from "@/hooks/use-hangout-roster";
import type { Hangout } from "@/types/hangout";
import type { Participant } from "@/types/participant";

export type HangoutMenuLayerHandle = {
  open: () => void;
};

type HangoutMenuLayerProps = {
  mode: HangoutMenuMode;
  hangoutId: string;
  sessionToken: string;
  hangout: Hangout;
  participant: Participant;
  rosterEnabled: boolean;
  onHangoutUpdate: (hangout: Hangout) => void;
  onHangoutCompleted?: (hangout: Hangout) => void;
};

/** Owns menu open state + roster prefetch so the parent page does not re-render on open. */
export const HangoutMenuLayer = forwardRef<HangoutMenuLayerHandle, HangoutMenuLayerProps>(
  function HangoutMenuLayer(
    {
      mode,
      hangoutId,
      sessionToken,
      hangout,
      participant,
      rosterEnabled,
      onHangoutUpdate,
      onHangoutCompleted,
    },
    ref,
  ) {
    const [menuOpen, setMenuOpen] = useState(false);

    const roster = useHangoutRoster({
      hangoutId,
      sessionToken,
      enabled: rosterEnabled && menuOpen,
    });

    const open = useCallback(() => {
      flushSync(() => setMenuOpen(true));
    }, []);

    const close = useCallback(() => setMenuOpen(false), []);

    useImperativeHandle(ref, () => ({ open }), [open]);

    return (
      <HangoutMenuModal
        open={menuOpen}
        onClose={close}
        mode={mode}
        hangoutId={hangoutId}
        sessionToken={sessionToken}
        hangout={hangout}
        participant={participant}
        onHangoutUpdate={onHangoutUpdate}
        onHangoutCompleted={onHangoutCompleted}
        rosterParticipants={roster.participants}
        rosterLoading={roster.loading}
        rosterError={roster.error}
        onRosterRefresh={roster.refresh}
      />
    );
  },
);
