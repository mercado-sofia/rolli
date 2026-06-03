export type Participant = {
  id: string;
  hangoutId: string;
  nickname: string;
  realName: string;
  sessionToken: string;
  isFilmKeeper: boolean;
  photosTaken: number;
  joinedAt: string;
  revealFinishedAt: string | null;
};
