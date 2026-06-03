import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Hangout } from "@/types/hangout";
import type { Participant } from "@/types/participant";

type SessionState = {
  hangout: Hangout | null;
  participant: Participant | null;
  /** Slug when the Film Keeper removed this device from the hangout (cleared on reset). */
  kickedFromSlug: string | null;
  /** True while exiting a hangout flow for the landing page — guards must not redirect. */
  leavingApp: boolean;
  setSession: (hangout: Hangout, participant: Participant) => void;
  setHangout: (hangout: Hangout | null) => void;
  setParticipant: (participant: Participant | null) => void;
  resetSession: () => void;
  /** Drop participant session after a keeper kick; keeps kicked UI without live session access. */
  evictFromHangout: (slug: string) => void;
  /** Clear session and mark an intentional exit so route guards stay out of the way. */
  leaveForHome: () => void;
  clearLeavingApp: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      hangout: null,
      participant: null,
      kickedFromSlug: null,
      leavingApp: false,
      setSession: (hangout, participant) =>
        set({ hangout, participant, kickedFromSlug: null, leavingApp: false }),
      setHangout: (hangout) => set({ hangout }),
      setParticipant: (participant) => set({ participant }),
      resetSession: () =>
        set({
          hangout: null,
          participant: null,
          kickedFromSlug: null,
          leavingApp: false,
        }),
      evictFromHangout: (slug) =>
        set({
          hangout: null,
          participant: null,
          kickedFromSlug: slug,
          leavingApp: false,
        }),
      leaveForHome: () =>
        set({
          hangout: null,
          participant: null,
          kickedFromSlug: null,
          leavingApp: true,
        }),
      clearLeavingApp: () => set({ leavingApp: false }),
    }),
    {
      name: "rolli-session",
      partialize: (state) => ({
        hangout: state.hangout,
        participant: state.participant,
      }),
    },
  ),
);
