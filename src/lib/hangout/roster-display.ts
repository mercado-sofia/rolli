import { useMemo, useRef } from "react";

import type { HangoutRosterParticipant } from "@/types/hangout-roster";

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

function rosterMemberKey(participants: HangoutRosterParticipant[]): string {
  return participants
    .map((participant) => participant.id)
    .sort()
    .join("\0");
}

/** Self first; other participants shuffled (stable until membership changes). */
export function useDisplayRosterParticipants(
  participants: HangoutRosterParticipant[],
  selfId: string,
): HangoutRosterParticipant[] {
  const orderRef = useRef<{ key: string; order: string[] }>({ key: "", order: [] });

  return useMemo(() => {
    const key = rosterMemberKey(participants);
    const byId = new Map(participants.map((participant) => [participant.id, participant]));

    if (key !== orderRef.current.key) {
      const self = participants.find((participant) => participant.id === selfId);
      const others = participants.filter((participant) => participant.id !== selfId);
      shuffleInPlace(others);
      orderRef.current = {
        key,
        order: self
          ? [self.id, ...others.map((participant) => participant.id)]
          : others.map((participant) => participant.id),
      };
    }

    return orderRef.current.order
      .map((id) => byId.get(id))
      .filter((participant): participant is HangoutRosterParticipant => participant !== undefined);
  }, [participants, selfId]);
}
