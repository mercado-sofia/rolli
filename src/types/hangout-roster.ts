import type { Hangout } from "@/types/hangout";

export type HangoutRosterParticipant = {
  id: string;
  nickname: string;
  isFilmKeeper: boolean;
  votesSubmitted: number | null;
  votesRequired: number | null;
  hasFinishedGuessing: boolean | null;
};

export type HangoutParticipantsResult = {
  participants: HangoutRosterParticipant[];
  hangout: Hangout;
};
