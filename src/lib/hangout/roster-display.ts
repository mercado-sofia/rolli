import { useMemo, useState } from "react";

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

function buildDisplayOrder(
  participants: HangoutRosterParticipant[],
  selfId: string,
): string[] {
  const self = participants.find((participant) => participant.id === selfId);
  const others = participants.filter((participant) => participant.id !== selfId);
  shuffleInPlace(others);
  return self
    ? [self.id, ...others.map((participant) => participant.id)]
    : others.map((participant) => participant.id);
}

/** Self first; other participants shuffled (stable until membership changes). */
export function useDisplayRosterParticipants(
  participants: HangoutRosterParticipant[],
  selfId: string,
): HangoutRosterParticipant[] {
  const memberKey = rosterMemberKey(participants);

  const [orderCache, setOrderCache] = useState(() => ({
    key: memberKey,
    order: buildDisplayOrder(participants, selfId),
  }));

  if (orderCache.key !== memberKey) {
    setOrderCache({
      key: memberKey,
      order: buildDisplayOrder(participants, selfId),
    });
  }

  return useMemo(() => {
    const byId = new Map(participants.map((participant) => [participant.id, participant]));

    return orderCache.order
      .map((id) => byId.get(id))
      .filter((participant): participant is HangoutRosterParticipant => participant !== undefined);
  }, [orderCache.order, participants]);
}
