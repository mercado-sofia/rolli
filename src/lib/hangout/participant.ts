import type { Hangout } from "@/types/hangout";
import type { Participant } from "@/types/participant";

/** Whether this participant is the current Film Keeper (from synced hangout state). */
export function isCurrentFilmKeeper(
  participant: Participant | null,
  hangout: Hangout | null,
): boolean {
  return Boolean(
    participant && hangout && participant.id === hangout.filmKeeperId,
  );
}

export function isParticipantReadyForGuessing(
  participant: Participant | null | undefined,
): boolean {
  return Boolean(participant?.revealFinishedAt);
}

/** True when persisted session belongs to this hangout slug and participant. */
export function isHangoutSessionValid(
  slug: string,
  hangout: Hangout | null | undefined,
  participant: Participant | null | undefined,
  sessionHangout: Hangout | null | undefined = hangout,
): boolean {
  if (!hangout || !participant || !sessionHangout) {
    return false;
  }

  return (
    hangout.slug === slug &&
    sessionHangout.slug === slug &&
    sessionHangout.id === hangout.id &&
    participant.hangoutId === hangout.id
  );
}
