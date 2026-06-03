import type { Hangout } from "@/types/hangout";
import type { Participant } from "@/types/participant";

export type RevealPhoto = {
  id: string;
  storagePath: string;
  capturedAt: string;
  signedUrl?: string;
  fileName?: string;
};

export type RevealPerspective = {
  participantId: string;
  nickname: string;
  realName?: string;
  isFilmKeeper?: boolean;
  photos: RevealPhoto[];
};

export type RevealReadyProgress = {
  ready: number;
  total: number;
};

export type RevealState = {
  perspectives: RevealPerspective[];
  readyProgress?: RevealReadyProgress;
  participant?: Participant;
  hangout?: Hangout;
};

export type MarkReadyForGuessingResult = {
  hangout: Hangout;
  participant: Participant;
};
